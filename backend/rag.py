import os
import hashlib
import fitz

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_ollama import OllamaLLM

DB_DIR = "chroma_db"

embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

llm = OllamaLLM(model="qwen2.5:latest")


def get_document_id(filename):
    return hashlib.md5(filename.encode()).hexdigest()


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


def ask_question(question, document_id):
    print("Starting question answering...")
    print(f"Searching only document_id: {document_id}")

    vectorstore = Chroma(
        persist_directory=DB_DIR,
        embedding_function=embeddings
    )

    docs = vectorstore.similarity_search(
        question,
        k=3,
        filter={"document_id": document_id}
    )

    print(f"Retrieved {len(docs)} matching chunks")

    context = "\n\n".join([doc.page_content for doc in docs])

    prompt = f"""
Answer the question using only the context below.

If the answer is not present in the context, say:
"I could not find this in the selected PDF."

Context:
{context}

Question:
{question}

Answer:
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
    print(f"Generating notes only for document_id: {document_id}")

    vectorstore = Chroma(
        persist_directory=DB_DIR,
        embedding_function=embeddings
    )

    print("Retrieving important chunks...")
    docs = vectorstore.similarity_search(
        "main topics key concepts summary important points",
        k=8,
        filter={"document_id": document_id}
    )

    print(f"Retrieved {len(docs)} chunks for summary")

    context = "\n\n".join([doc.page_content for doc in docs])

    prompt = f"""
Create detailed, well-explained study notes from the context below.

Important formatting rules:
- Do not use markdown symbols like #, ##, ###, or **.
- Use clean section headings in plain text.
- Make the notes elaborate and exam-friendly.
- Explain each concept clearly.
- Include definitions, important points, and examples if available.
- Keep the language simple and student-friendly.

Structure:

Summary

Important Concepts

Detailed Explanation

Key Terms

Exam-Oriented Points

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