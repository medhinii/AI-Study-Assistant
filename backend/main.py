import os
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from rag import process_pdf, ask_question, summarize_uploaded_documents
from youtube_notes import generate_notes

app = FastAPI(title="Explainable AI Study Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QuestionRequest(BaseModel):
    question: str
    document_id: str


class YouTubeRequest(BaseModel):
    url: str


@app.get("/")
def root():
    return {"message": "Explainable AI Study Assistant Backend Running"}


@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    os.makedirs("uploaded_docs", exist_ok=True)

    safe_filename = file.filename.replace(" ", "_").replace("(", "").replace(")", "")
    file_path = os.path.join("uploaded_docs", safe_filename)

    with open(file_path, "wb") as f:
        f.write(await file.read())

    result = process_pdf(file_path)

    return {
        "status": "success",
        "filename": safe_filename,
        "chunks_created": result["chunks_created"],
        "document_id": result["document_id"],
    }


@app.post("/ask")
def ask(data: QuestionRequest):
    return ask_question(data.question, data.document_id)


@app.post("/summarize-pdf")
def summarize_pdf(data: QuestionRequest):
    return summarize_uploaded_documents(data.document_id)


@app.post("/youtube-notes")
def youtube_notes(data: YouTubeRequest):
    return generate_notes(data.url)