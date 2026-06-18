# AI Study Assistant

## Overview

An AI-powered study assistant that allows users to upload PDFs, ask questions, generate study notes, create quizzes, and extract notes from YouTube videos. The system combines Hybrid Retrieval, GraphRAG-inspired concept retrieval, Cross-Encoder reranking, and local Large Language Models to provide accurate, explainable, and source-backed responses.

Unlike traditional RAG systems that rely only on vector search, this project integrates semantic retrieval, keyword retrieval, concept-based retrieval, and reranking to improve answer quality while maintaining transparency through source citations.

---

## Key Features

### PDF Question Answering

* Upload multiple PDFs
* Ask natural language questions
* Answers generated only from the selected document
* Source-backed responses with page references

### Hybrid Retrieval Pipeline

* Semantic Search using ChromaDB
* BM25 Keyword Search
* GraphRAG-inspired Concept Retrieval
* Cross-Encoder Reranking

### Explainable AI

* Displays source chunks used to generate answers
* Shows page references from uploaded PDFs
* Reduces hallucinations by grounding responses in retrieved context

### Automated Study Notes

* Generates structured study notes from PDFs
* Includes:

  * Summary
  * Important Concepts
  * Detailed Explanation
  * Key Terms
  * Exam Notes

### Interactive Quiz Generator

* Automatically creates MCQs from uploaded documents
* Tracks progress and score
* Immediate feedback for correct and incorrect answers

### YouTube Video Notes

* Extracts transcript from YouTube videos
* Generates structured study notes
* Stores history for future access

### Chat History Management

* Multiple PDF conversations
* ChatGPT-like chat switching
* Persistent storage using Local Storage
* Delete individual questions
* Delete entire chats

---

# System Architecture

```text
PDF Upload
    │
    ▼
Text Extraction (PyMuPDF)
    │
    ▼
Chunking (RecursiveCharacterTextSplitter)
    │
    ├──────────────► ChromaDB
    │                   │
    │                   ▼
    │            Vector Search
    │
    ├──────────────► BM25 Index
    │                   │
    │                   ▼
    │            Keyword Search
    │
    ├──────────────► GraphRAG Index
    │                   │
    │                   ▼
    │            Concept Retrieval
    │
    ▼
Hybrid Retrieval
    │
    ▼
Cross Encoder Reranking
    │
    ▼
Qwen 3 8B (Ollama)
    │
    ▼
Answer Generation
```

---

# Technologies Used

## Frontend

* React.js
* Axios
* HTML
* CSS
* Local Storage

## Backend

* FastAPI
* Python

## AI / NLP

* Ollama
* Qwen3:8B
* Sentence Transformers
* Cross Encoder
* spaCy

## Retrieval

* ChromaDB
* BM25
* Hybrid Retrieval
* GraphRAG-inspired Concept Retrieval

## Document Processing

* PyMuPDF (fitz)
* RecursiveCharacterTextSplitter

---

# Retrieval Pipeline

### Vector Search

Uses Sentence Transformers embeddings and ChromaDB to retrieve semantically similar chunks.

Example:

```text
Question:
How does lazy loading work?

Retrieved:
Demand Paging
```

Even though the exact phrase may not exist in the PDF.

---

### BM25 Keyword Search

Retrieves chunks containing exact keywords.

Example:

```text
Question:
What is TLB?

Retrieved:
Chunk containing TLB
```

---

### GraphRAG-Inspired Retrieval

Uses spaCy-based concept extraction to build concept-to-chunk relationships.

Example:

```text
Question:
How is Virtual Memory related to Demand Paging?
```

The graph identifies chunks containing both concepts and retrieves connected information.

---

### Cross Encoder Reranking

After retrieval, all candidate chunks are reranked based on question relevance.

This significantly improves answer quality by selecting the most relevant context before passing it to the LLM.

---

# Installation

## Clone Repository

```bash
git clone <repository-url>
cd explainable-multi-document-rag-system
```

---

## Backend Setup

```bash
cd backend

python -m venv venv

venv\Scripts\activate

pip install -r requirements.txt
```

---

## Install spaCy Model

```bash
python -m spacy download en_core_web_sm
```

---

## Install Ollama

Download Ollama and pull the model:

```bash
ollama pull qwen3:8b
```

---

## Start Backend

```bash
uvicorn main:app --reload
```

---

## Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

---

# Usage

### Upload PDF

1. Select PDF
2. Upload
3. PDF appears in history

### Ask Questions

1. Select PDF
2. Ask question
3. Receive source-backed answer

### Generate Notes

1. Select PDF
2. Click Generate Notes
3. Download notes if needed

### Generate Quiz

1. Select PDF
2. Generate quiz
3. Attempt MCQs
4. View score

### YouTube Notes

1. Paste video URL
2. Generate notes
3. Access from history

---


# Future Enhancements

* Retrieval diagnostics dashboard
* Confidence score estimation
* OCR support for scanned PDFs
* Multi-modal document support
* Cloud deployment
* User authentication
* Advanced knowledge graph construction

---

## Author

**Medhini Sasanapuri**

Built as a full-stack AI learning platform combining React, FastAPI, LangChain, ChromaDB, HuggingFace Embeddings, and Ollama-powered LLMs to create explainable and source-backed study assistance.
