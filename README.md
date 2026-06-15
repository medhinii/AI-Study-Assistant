# Explainable AI Study Assistant

An AI-powered study platform that transforms PDFs and YouTube videos into structured study material. The system uses Retrieval-Augmented Generation (RAG) to provide source-backed answers, generate detailed notes, and help students learn more effectively through explainable AI.

---

## Features

### PDF Learning Assistant

* Upload PDF study material
* Extract and process document content
* Ask questions from uploaded PDFs
* Get source-backed answers
* Generate detailed study notes
* Support for multiple PDFs
* Persistent document storage

### YouTube Learning Assistant

* Generate notes from YouTube videos
* Extract video transcripts automatically
* Create structured study material
* Summarize key concepts
* Generate exam-oriented notes

### Explainable AI Features

* Answers generated only from uploaded content
* Source references for transparency
* Retrieval-based question answering
* Reduced hallucinations using RAG

### Smart History System

* PDF history tracking
* YouTube history tracking
* Restore previous learning sessions
* Preserve generated notes
* Preserve question-answer history

### User Experience

* Modern React interface
* Download generated notes
* Scrollable note viewer
* Session persistence using local storage
* Responsive design

---

## Tech Stack

### Frontend

* React.js
* Axios
* CSS
* Vite

### Backend

* FastAPI
* Python

### AI & RAG

* LangChain
* ChromaDB
* HuggingFace Embeddings
* Ollama
* Qwen 2.5

### Document Processing

* PyMuPDF (fitz)

### YouTube Processing

* YouTube Transcript API

---

## System Architecture

### PDF Workflow

```text
PDF Upload
    ↓
Text Extraction (PyMuPDF)
    ↓
Text Chunking
    ↓
Embedding Generation
    ↓
ChromaDB Storage
    ↓
User Question
    ↓
Similarity Search
    ↓
Relevant Chunks Retrieved
    ↓
Qwen LLM
    ↓
Source-Backed Answer
```

### YouTube Workflow

```text
YouTube URL
    ↓
Transcript Extraction
    ↓
Chunked Summarization
    ↓
Partial Summaries
    ↓
Final Note Generation
    ↓
Study Notes
```

---

## Key Concepts Used

### Retrieval-Augmented Generation (RAG)

Instead of sending the entire document to the LLM, the system:

1. Splits documents into chunks
2. Converts chunks into embeddings
3. Stores embeddings in a vector database
4. Retrieves only relevant chunks
5. Generates answers using retrieved content

This improves accuracy and reduces hallucinations.

---

### Embeddings

Text is converted into numerical vectors that capture semantic meaning.

Example:

```text
"Artificial Intelligence"
"Machine Learning"
```

These concepts will have similar embeddings even though the words differ.

---

### Vector Database

ChromaDB stores embeddings and performs similarity search to find the most relevant information for a user's question.

---

## Installation

### Clone Repository

```bash
git clone <repository-url>
cd explainable-ai-study-assistant
```

### Backend Setup

```bash
cd backend

python -m venv venv

venv\Scripts\activate

pip install -r requirements.txt
```

### Frontend Setup

```bash
cd frontend/frontend

npm install
```

---

## Running the Application

### Start Backend

```bash
cd backend

venv\Scripts\activate

python -m uvicorn main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

---

### Start Frontend

```bash
cd frontend/frontend

npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

## Project Structure

```text
explainable-ai-study-assistant
│
├── backend
│   ├── main.py
│   ├── rag.py
│   ├── youtube_notes.py
│   ├── uploaded_docs
│   ├── chroma_db
│   └── requirements.txt
│
├── frontend
│   └── frontend
│       ├── src
│       │   ├── App.jsx
│       │   ├── main.jsx
│       │   └── index.css
│       │
│       ├── public
│       ├── package.json
│       └── vite.config.js
│
└── README.md
```

---

## Future Enhancements

* Multi-document comparison
* Flashcard generation
* Quiz generation
* PDF highlighting with source location
* Mind map generation
* Voice-based question answering
* Cloud deployment
* User authentication
* Progress tracking

---

## Learning Outcomes

This project demonstrates:

* Retrieval-Augmented Generation (RAG)
* Vector Databases
* Semantic Search
* LLM Integration
* FastAPI Development
* React Frontend Development
* Full-Stack AI Applications
* Document Intelligence Systems
* Explainable AI Concepts
* YouTube Content Processing

---

## Author

**Medhini Sasanapuri**

Built as a full-stack AI learning platform combining React, FastAPI, LangChain, ChromaDB, HuggingFace Embeddings, and Ollama-powered LLMs to create explainable and source-backed study assistance.
