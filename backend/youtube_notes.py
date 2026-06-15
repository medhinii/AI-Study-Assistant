from youtube_transcript_api import YouTubeTranscriptApi
from langchain_ollama import OllamaLLM

llm = OllamaLLM(
    model="llama3.2:1b"
)


def extract_video_id(url):
    if "watch?v=" in url:
        return url.split("watch?v=")[1].split("&")[0]

    if "youtu.be/" in url:
        return url.split("youtu.be/")[1].split("?")[0]

    return url


def split_text(text, chunk_size=2500):
    chunks = []

    for i in range(0, len(text), chunk_size):
        chunks.append(text[i:i + chunk_size])

    return chunks


def summarize_chunk(chunk, chunk_number):
    prompt = f"""
Summarize this part of a YouTube transcript.

Rules:
Do not use markdown symbols like #, *, or -.
Use simple language.
Capture all important points.
Keep it concise but meaningful.

Transcript Part {chunk_number}:
{chunk}

Summary:
"""

    return llm.invoke(prompt)


def combine_summaries(summaries):
    combined_text = "\n\n".join(summaries)

    prompt = f"""
Create detailed study notes from these partial summaries.

Rules:
Do not use markdown symbols like #, *, or -.
Use plain headings only.
Cover all important points from all parts.
Make the notes useful for exam preparation.
Use simple language.

Format:
SUMMARY

IMPORTANT CONCEPTS

DETAILED EXPLANATION

KEY TERMS

EXAM NOTES

Partial Summaries:
{combined_text}

Final Notes:
"""

    return llm.invoke(prompt)


def generate_notes(video_url):
    print("Starting YouTube chunked notes generation...")

    video_id = extract_video_id(video_url)
    print(f"Video ID: {video_id}")

    print("Fetching transcript...")
    ytt_api = YouTubeTranscriptApi()
    transcript = ytt_api.fetch(video_id)
    print("Transcript fetched")

    text = " ".join([snippet.text for snippet in transcript])
    print(f"Transcript length: {len(text)} characters")

    chunks = split_text(text, chunk_size=2500)
    print(f"Transcript split into {len(chunks)} chunks")

    chunk_summaries = []

    for index, chunk in enumerate(chunks, start=1):
        print(f"Summarizing chunk {index}/{len(chunks)}...")
        summary = summarize_chunk(chunk, index)
        chunk_summaries.append(summary)

    print("Combining all chunk summaries...")
    final_notes = combine_summaries(chunk_summaries)

    print("YouTube notes generated successfully")

    return {
        "video_id": video_id,
        "chunks_processed": len(chunks),
        "notes": final_notes
    }