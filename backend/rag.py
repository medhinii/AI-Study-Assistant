import os
import hashlib
import fitz
import json
import re
import spacy
from collections import Counter, defaultdict

from rank_bm25 import BM25Okapi

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_ollama import OllamaLLM
from sentence_transformers import CrossEncoder


DB_DIR = "chroma_db"
CHUNKS_DIR = "stored_chunks"
GRAPH_DIR = "stored_graphs"

os.makedirs(CHUNKS_DIR, exist_ok=True)
os.makedirs(GRAPH_DIR, exist_ok=True)


embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

llm = OllamaLLM(model="qwen3:8b")
nlp = spacy.load("en_core_web_sm")

reranker = CrossEncoder(
    "cross-encoder/ms-marco-MiniLM-L-6-v2"
)


STOPWORDS = {
    "this", "that", "with", "from", "they", "have", "their", "there",
    "which", "will", "would", "could", "should", "about", "into",
    "between", "through", "because", "where", "when", "what", "while",
    "also", "then", "than", "them", "these", "those", "only", "such",
    "using", "used", "each", "other", "more", "most", "some", "very",
    "been", "being", "were", "your", "you", "are", "the", "and", "for",
    "not", "can", "has", "had", "was", "is", "of", "to", "in", "on",
    "as", "by", "an", "or", "it", "at"
}


def get_document_id(filename):
    return hashlib.md5(filename.encode()).hexdigest()


def get_chunk_file_path(document_id):
    return os.path.join(CHUNKS_DIR, f"{document_id}.json")


def get_graph_file_path(document_id):
    return os.path.join(GRAPH_DIR, f"{document_id}.json")


def tokenize(text):
    return re.findall(r"\b\w+\b", text.lower())


def extract_concepts_from_text(text, max_concepts=8):
    doc = nlp(text[:3000])

    concepts = []

    for chunk in doc.noun_chunks:
        phrase = chunk.text.lower().strip()

        phrase = re.sub(r"[^a-z0-9\s]", "", phrase)
        phrase = re.sub(r"\s+", " ", phrase).strip()

        words = phrase.split()

        if len(words) == 0:
            continue

        if all(word in STOPWORDS for word in words):
            continue

        if len(phrase) < 4:
            continue

        concepts.append(phrase)

    for ent in doc.ents:
        entity = ent.text.lower().strip()

        entity = re.sub(r"[^a-z0-9\s]", "", entity)
        entity = re.sub(r"\s+", " ", entity).strip()

        if len(entity) >= 4:
            concepts.append(entity)

    counts = Counter(concepts)

    return [
        concept
        for concept, count in counts.most_common(max_concepts)
    ]

def save_chunks_for_bm25(document_id, chunks):
    print("Saving chunks for BM25 keyword search...")

    chunk_data = []

    for index, chunk in enumerate(chunks):
        metadata = dict(chunk.metadata)
        metadata["chunk_id"] = f"{document_id}_{index}"

        chunk.metadata = metadata

        chunk_data.append(
            {
                "page_content": chunk.page_content,
                "metadata": metadata
            }
        )

    file_path = get_chunk_file_path(document_id)

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(chunk_data, f, ensure_ascii=False, indent=2)

    print(f"Saved {len(chunk_data)} chunks for BM25")


def load_chunks_for_bm25(document_id):
    file_path = get_chunk_file_path(document_id)

    if not os.path.exists(file_path):
        print("No BM25 chunk file found for this document.")
        return []

    with open(file_path, "r", encoding="utf-8") as f:
        chunk_data = json.load(f)

    docs = []

    for item in chunk_data:
        docs.append(
            Document(
                page_content=item["page_content"],
                metadata=item["metadata"]
            )
        )

    return docs


def build_lightweight_graph(document_id, chunks):
    print("Building lightweight GraphRAG concept graph...")

    concept_to_chunks = defaultdict(list)
    chunk_to_concepts = {}

    for chunk in chunks:
        chunk_id = chunk.metadata.get("chunk_id")
        concepts = extract_concepts_from_text(chunk.page_content)

        chunk_to_concepts[chunk_id] = concepts

        for concept in concepts:
            concept_to_chunks[concept].append(chunk_id)

    graph_data = {
        "document_id": document_id,
        "concept_to_chunks": dict(concept_to_chunks),
        "chunk_to_concepts": chunk_to_concepts
    }

    file_path = get_graph_file_path(document_id)

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(graph_data, f, ensure_ascii=False, indent=2)

    print("GraphRAG concept graph created successfully")


def load_graph(document_id):
    file_path = get_graph_file_path(document_id)

    if not os.path.exists(file_path):
        print("No GraphRAG file found for this document.")
        return None

    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def graphrag_search(question, document_id, k=10):
    print("Running lightweight GraphRAG search...")

    graph = load_graph(document_id)
    docs = load_chunks_for_bm25(document_id)

    if not graph or not docs:
        return []

    query_concepts = extract_concepts_from_text(question, max_concepts=6)

    print(f"Query concepts: {query_concepts}")

    chunk_scores = defaultdict(int)

    concept_to_chunks = graph.get("concept_to_chunks", {})
    chunk_to_concepts = graph.get("chunk_to_concepts", {})

    for concept in query_concepts:
        related_chunks = concept_to_chunks.get(concept, [])

        for chunk_id in related_chunks:
            chunk_scores[chunk_id] += 3

            related_concepts = chunk_to_concepts.get(chunk_id, [])

            for related_concept in related_concepts:
                for expanded_chunk_id in concept_to_chunks.get(related_concept, []):
                    chunk_scores[expanded_chunk_id] += 1

    ranked_chunk_ids = sorted(
        chunk_scores.keys(),
        key=lambda chunk_id: chunk_scores[chunk_id],
        reverse=True
    )[:k]

    chunk_map = {
        doc.metadata.get("chunk_id"): doc
        for doc in docs
    }

    graph_docs = [
        chunk_map[chunk_id]
        for chunk_id in ranked_chunk_ids
        if chunk_id in chunk_map
    ]

    print(f"GraphRAG retrieved chunks: {len(graph_docs)}")

    return graph_docs


def bm25_search(question, document_id, k=10):
    print("Running BM25 keyword search...")

    docs = load_chunks_for_bm25(document_id)

    if not docs:
        return []

    tokenized_docs = [
        tokenize(doc.page_content)
        for doc in docs
    ]

    bm25 = BM25Okapi(tokenized_docs)

    tokenized_query = tokenize(question)

    scores = bm25.get_scores(tokenized_query)

    ranked_indices = sorted(
        range(len(scores)),
        key=lambda i: scores[i],
        reverse=True
    )[:k]

    bm25_docs = [
        docs[i]
        for i in ranked_indices
        if scores[i] > 0
    ]

    print(f"BM25 retrieved chunks: {len(bm25_docs)}")

    return bm25_docs


def merge_documents(*doc_lists):
    print("Merging retrieved results...")

    merged = []
    seen = set()

    for docs in doc_lists:
        for doc in docs:
            metadata = doc.metadata or {}

            unique_key = metadata.get("chunk_id")

            if not unique_key:
                unique_key = (
                    str(metadata.get("document_id", "")) +
                    str(metadata.get("page_number", "")) +
                    doc.page_content[:100]
                )

            if unique_key not in seen:
                merged.append(doc)
                seen.add(unique_key)

    print(f"Merged unique chunks: {len(merged)}")

    return merged


def hybrid_graph_retrieve(question, document_id, vector_k=10, keyword_k=10, graph_k=10):
    print("Starting Hybrid + GraphRAG retrieval...")

    vectorstore = Chroma(
        persist_directory=DB_DIR,
        embedding_function=embeddings
    )

    vector_docs = vectorstore.similarity_search(
        question,
        k=vector_k,
        filter={"document_id": document_id}
    )

    print(f"Vector retrieved chunks: {len(vector_docs)}")

    keyword_docs = bm25_search(
        question,
        document_id,
        k=keyword_k
    )

    graph_docs = graphrag_search(
        question,
        document_id,
        k=graph_k
    )

    combined_docs = merge_documents(
        vector_docs,
        keyword_docs,
        graph_docs
    )

    print("Hybrid + GraphRAG retrieval completed")

    return combined_docs


def process_pdf(pdf_path):
    print("Starting PDF processing...")

    filename = os.path.basename(pdf_path)
    document_id = get_document_id(filename)

    pdf = fitz.open(pdf_path)
    print(f"PDF opened. Total pages: {len(pdf)}")

    documents = []

    for page_num in range(len(pdf)):
        print(f"Reading page {page_num + 1}")

        page = pdf[page_num]
        text = page.get_text()

        if text.strip():
            documents.append(
                Document(
                    page_content=text,
                    metadata={
                        "page_number": page_num + 1,
                        "source": filename,
                        "document_id": document_id,
                    },
                )
            )

    print(f"Text extracted from {len(documents)} pages")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=80
    )

    chunks = splitter.split_documents(documents)
    print(f"Created {len(chunks)} chunks")

    save_chunks_for_bm25(document_id, chunks)
    build_lightweight_graph(document_id, chunks)

    vectorstore = Chroma(
        persist_directory=DB_DIR,
        embedding_function=embeddings
    )

    print("Storing chunks in ChromaDB...")
    vectorstore.add_documents(chunks)

    print("PDF processing completed successfully")

    return {
        "chunks_created": len(chunks),
        "document_id": document_id
    }


def rerank_documents(question, docs, top_k=3):
    print("Reranking retrieved chunks...")

    if not docs:
        return []

    pairs = []

    for doc in docs:
        pairs.append([question, doc.page_content])

    scores = reranker.predict(pairs)

    scored_docs = list(zip(docs, scores))

    scored_docs.sort(
        key=lambda x: x[1],
        reverse=True
    )

    reranked_docs = [
        doc
        for doc, score in scored_docs[:top_k]
    ]

    print("Reranking completed")

    return reranked_docs


def ask_question(question, document_id):
    print("Starting question answering...")
    print(f"Searching only document_id: {document_id}")

    docs = hybrid_graph_retrieve(
        question,
        document_id,
        vector_k=10,
        keyword_k=10,
        graph_k=10
    )

    print(f"Initial retrieved chunks: {len(docs)}")

    docs = rerank_documents(
        question,
        docs,
        top_k=3
    )

    print(f"Final chunks after reranking: {len(docs)}")

    context = "\n\n".join([doc.page_content for doc in docs])

    prompt = f"""
You are an expert teacher.

Using the context below, answer the question clearly.

Rules:
- Start with the direct answer.
- Explain in 1-2 short paragraphs.
- No repetition.
- No markdown symbols.
- No phrases like "According to the context".
- No phrases like "Answer:".
- Keep answers exam-friendly.
- If the answer is missing, reply:
"I could not find this in the selected PDF."

Context:
{context}

Question:
{question}
"""

    print("Sending question to Qwen...")
    answer = llm.invoke(prompt)
    print("Answer generated successfully")

    sources = []

    for doc in docs:
        sources.append(
            {
                "page": doc.metadata.get("page_number"),
                "source": doc.metadata.get("source"),
                "content": doc.page_content[:500],
            }
        )

    return {
        "answer": answer,
        "sources": sources
    }


def summarize_uploaded_documents(document_id):
    print("Starting PDF notes generation...")

    query = "main topics key concepts detailed explanation definitions examples exam points"

    docs = hybrid_graph_retrieve(
        query,
        document_id,
        vector_k=12,
        keyword_k=12,
        graph_k=12
    )

    docs = rerank_documents(
        query,
        docs,
        top_k=8
    )

    print(f"Retrieved {len(docs)} chunks for summary")

    context = "\n\n".join([doc.page_content for doc in docs])

    prompt = f"""
Create comprehensive and well-explained study notes from the context below.

Rules:
Do not use markdown symbols such as #, ##, ###, **, *, or bullet symbols.
Use plain text only.
Use clear section headings in uppercase.
Make the notes detailed and exam-friendly.
Explain every important concept properly.
Add definitions wherever possible.
Add examples if they are available in the context.
Use simple student-friendly language.
Do not make the notes too short.
Do not say "based on the context" in the answer.

Use this exact structure:

SUMMARY

Write 2 to 4 detailed paragraphs explaining what the topic is about.

IMPORTANT CONCEPTS

For each important concept, write the concept name on a separate line.
Then explain it clearly in detail.

DETAILED EXPLANATION

Explain the topic step by step.
Include how it works, why it is needed, and important conditions or rules.

KEY TERMS

Write each term in this format:
Term : Meaning

EXAM NOTES

Write exam-oriented revision points.
Make them clear, direct, and useful for answering theory questions.

Context:
{context}

Notes:
"""

    print("Sending prompt to Qwen...")
    notes = llm.invoke(prompt)

    print("Notes generated successfully")

    return {
        "notes": notes
    }


def generate_quiz(document_id):
    print("Generating interactive quiz...")

    query = "important concepts key topics definitions exam questions"

    docs = hybrid_graph_retrieve(
        query,
        document_id,
        vector_k=10,
        keyword_k=10,
        graph_k=10
    )

    docs = rerank_documents(
        query,
        docs,
        top_k=7
    )

    context = "\n\n".join([doc.page_content for doc in docs])

    prompt = f"""
Create exactly 10 multiple choice questions from the context below.

Return ONLY valid JSON.
Do not include markdown.
Do not include explanations outside the JSON.

JSON format:
[
  {{
    "question": "Question text",
    "options": [
      "Option A",
      "Option B",
      "Option C",
      "Option D"
    ],
    "answer": "Correct option text"
  }}
]

Rules:
Use only the given context.
Each question must have exactly 4 options.
The answer must exactly match one of the options.
Do not write A, B, C, D before the options.
Do not add any text before or after the JSON.

Context:
{context}
"""

    print("Sending quiz prompt to Qwen...")
    quiz_response = llm.invoke(prompt)

    print("Parsing quiz JSON...")

    try:
        quiz = json.loads(quiz_response)
    except Exception:
        match = re.search(r"\[.*\]", quiz_response, re.DOTALL)

        if not match:
            raise ValueError("Could not parse quiz JSON from LLM response")

        quiz = json.loads(match.group())

    print("Quiz generated successfully")

    return {
        "quiz": quiz
    }