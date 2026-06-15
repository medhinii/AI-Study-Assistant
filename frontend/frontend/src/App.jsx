import { useState } from "react";
import axios from "axios";
import "./index.css";

const API = "http://127.0.0.1:8000";

function App() {
  const [pdf, setPdf] = useState(null);
  const [question, setQuestion] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const [uploadedPDFs, setUploadedPDFs] = useState(
    JSON.parse(localStorage.getItem("uploadedPDFs")) || []
  );

  const [youtubeHistory, setYoutubeHistory] = useState(
    JSON.parse(localStorage.getItem("youtubeHistory")) || []
  );

  const [activePDF, setActivePDF] = useState(
    JSON.parse(localStorage.getItem("activePDF")) || null
  );

  const [activeYoutube, setActiveYoutube] = useState(
    JSON.parse(localStorage.getItem("activeYoutube")) || null
  );

  const [loading, setLoading] = useState("");

  const savePDFs = (updatedPDFs) => {
    setUploadedPDFs(updatedPDFs);
    localStorage.setItem("uploadedPDFs", JSON.stringify(updatedPDFs));
  };

  const saveYoutubeHistory = (updatedHistory) => {
    setYoutubeHistory(updatedHistory);
    localStorage.setItem("youtubeHistory", JSON.stringify(updatedHistory));
  };

  const selectPDF = (file) => {
    setActivePDF(file);
    setActiveYoutube(null);
    localStorage.setItem("activePDF", JSON.stringify(file));
    localStorage.removeItem("activeYoutube");
  };

  const selectYoutube = (video) => {
    setActiveYoutube(video);
    setActivePDF(null);
    localStorage.setItem("activeYoutube", JSON.stringify(video));
    localStorage.removeItem("activePDF");
  };

  const cleanLine = (line) => {
    return line
      .replaceAll("#", "")
      .replaceAll("*", "")
      .replaceAll("•", "")
      .replaceAll("-", "")
      .trim();
  };

  const renderFormattedNotes = (notes) => {
    const mainHeadings = [
      "SUMMARY",
      "IMPORTANT CONCEPTS",
      "DETAILED EXPLANATION",
      "KEY TERMS",
      "EXAM NOTES",
    ];

    return notes.split("\n").map((line, index) => {
      const cleaned = cleanLine(line);

      if (!cleaned) return <br key={index} />;

      if (mainHeadings.includes(cleaned.toUpperCase())) {
        return (
          <h2 className="notes-main-heading" key={index}>
            {cleaned}
          </h2>
        );
      }

      if (cleaned.length < 65 && cleaned === cleaned.toUpperCase()) {
        return (
          <h3 className="notes-sub-heading" key={index}>
            {cleaned}
          </h3>
        );
      }

      return (
        <p className="notes-content" key={index}>
          {cleaned}
        </p>
      );
    });
  };

  const downloadTextFile = (content, filename) => {
    const cleanedContent = content
      .replaceAll("#", "")
      .replaceAll("*", "")
      .replaceAll("•", "")
      .replaceAll("-", "");

    const blob = new Blob([cleanedContent], {
      type: "text/plain",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  };

  const uploadPDF = async () => {
    if (!pdf) {
      alert("Please select a PDF first.");
      return;
    }

    try {
      setLoading("upload");

      const formData = new FormData();
      formData.append("file", pdf);

      const res = await axios.post(`${API}/upload-pdf`, formData);

      const newPDF = {
        id: Date.now(),
        name: pdf.name,
        backendName: res.data.filename,
        chunks: res.data.chunks_created,
        document_id: res.data.document_id,
        notes: "",
        chatHistory: [],
        uploadedAt: new Date().toLocaleString(),
      };

      const updatedPDFs = [newPDF, ...uploadedPDFs];

      savePDFs(updatedPDFs);
      selectPDF(newPDF);

      alert("PDF uploaded successfully!");
    } catch (error) {
      console.error(error);
      alert("PDF upload failed. Check backend terminal.");
    } finally {
      setLoading("");
    }
  };

  const askQuestion = async () => {
    if (!activePDF) {
      alert("Please select or upload a PDF first.");
      return;
    }

    if (!question.trim()) return;

    try {
      setLoading("ask");

      const res = await axios.post(`${API}/ask`, {
        question,
        document_id: activePDF.document_id,
      });

      const newChat = {
        question,
        answer: res.data.answer,
        sources: res.data.sources || [],
        askedAt: new Date().toLocaleString(),
      };

      const updatedPDF = {
        ...activePDF,
        chatHistory: [newChat, ...(activePDF.chatHistory || [])],
      };

      const updatedPDFs = uploadedPDFs.map((file) =>
        file.id === activePDF.id ? updatedPDF : file
      );

      savePDFs(updatedPDFs);
      selectPDF(updatedPDF);
      setQuestion("");
    } catch (error) {
      console.error(error);
      alert("Question failed. Check backend terminal.");
    } finally {
      setLoading("");
    }
  };

  const summarizePDF = async () => {
    if (!activePDF) {
      alert("Please select or upload a PDF first.");
      return;
    }

    try {
      setLoading("summary");

      const res = await axios.post(`${API}/summarize-pdf`, {
        question: "summary",
        document_id: activePDF.document_id,
      });

      const updatedPDF = {
        ...activePDF,
        notes: res.data.notes,
      };

      const updatedPDFs = uploadedPDFs.map((file) =>
        file.id === activePDF.id ? updatedPDF : file
      );

      savePDFs(updatedPDFs);
      selectPDF(updatedPDF);
    } catch (error) {
      console.error(error);
      alert("PDF notes generation failed.");
    } finally {
      setLoading("");
    }
  };

  const generateYoutubeNotes = async () => {
    if (!youtubeUrl.trim()) {
      alert("Please paste a YouTube URL.");
      return;
    }

    try {
      setLoading("youtube");

      const res = await axios.post(`${API}/youtube-notes`, {
        url: youtubeUrl,
      });

      const newVideo = {
        id: Date.now(),
        url: youtubeUrl,
        notes: res.data.notes,
        generatedAt: new Date().toLocaleString(),
      };

      const updatedHistory = [newVideo, ...youtubeHistory];

      saveYoutubeHistory(updatedHistory);
      selectYoutube(newVideo);
      setYoutubeUrl("");
    } catch (error) {
      console.error(error);
      alert("YouTube notes generation failed.");
    } finally {
      setLoading("");
    }
  };

  const clearHistory = () => {
    localStorage.clear();

    setUploadedPDFs([]);
    setYoutubeHistory([]);
    setActivePDF(null);
    setActiveYoutube(null);
    setQuestion("");
    setYoutubeUrl("");
    setPdf(null);

    alert("History cleared.");
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">📚 StudyAI</div>

        <nav>
          <a href="#upload">Upload PDF</a>
          <a href="#ask">Ask Questions</a>
          <a href="#summary">PDF Notes</a>
          <a href="#youtube">YouTube Notes</a>
        </nav>

        <div className="pdf-list">
          <h3>PDF History</h3>

          {uploadedPDFs.length === 0 ? (
            <p className="muted">No PDFs uploaded yet</p>
          ) : (
            uploadedPDFs.map((file) => (
              <button
                className={
                  activePDF?.id === file.id
                    ? "history-item active-history"
                    : "history-item"
                }
                key={file.id}
                onClick={() => selectPDF(file)}
              >
                <span>📄 {file.name}</span>
                <small>{file.chunks} chunks</small>
              </button>
            ))
          )}
        </div>

        <div className="pdf-list">
          <h3>YouTube History</h3>

          {youtubeHistory.length === 0 ? (
            <p className="muted">No videos yet</p>
          ) : (
            youtubeHistory.map((video) => (
              <button
                className={
                  activeYoutube?.id === video.id
                    ? "history-item active-history"
                    : "history-item"
                }
                key={video.id}
                onClick={() => selectYoutube(video)}
              >
                <span>▶️ YouTube Notes</span>
                <small>{video.generatedAt}</small>
              </button>
            ))
          )}
        </div>

        <button className="clear-btn" onClick={clearHistory}>
          Clear History
        </button>
      </aside>

      <main className="main">
        <section className="hero">
          <p className="badge">Explainable AI Learning Platform</p>
          <h1>Turn PDFs and YouTube videos into study material.</h1>
          <p className="hero-text">
            Ask questions, generate notes, and view source-backed answers from
            your uploaded content.
          </p>
        </section>

        {activePDF && (
          <section className="active-card">
            <h2>Active PDF</h2>
            <p>
              <strong>{activePDF.name}</strong>
            </p>
            <p>{activePDF.chunks} chunks created</p>
            <p>Uploaded: {activePDF.uploadedAt}</p>
          </section>
        )}

        {activeYoutube && (
          <section className="active-card youtube-active">
            <h2>Active YouTube Notes</h2>
            <p>{activeYoutube.url}</p>
            <p>Generated: {activeYoutube.generatedAt}</p>
          </section>
        )}

        <section className="grid">
          <div className="card" id="upload">
            <h2>Upload PDF</h2>
            <p className="card-subtitle">
              Add study material and convert it into searchable knowledge.
            </p>

            <label className="file-box">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setPdf(e.target.files[0])}
              />
              <span>
                {pdf
                  ? pdf.name
                  : activePDF
                  ? activePDF.name
                  : "Choose a PDF file"}
              </span>
            </label>

            <button onClick={uploadPDF}>
              {loading === "upload" ? "Processing..." : "Upload PDF"}
            </button>
          </div>

          <div className="card" id="summary">
            <h2>Generate PDF Notes</h2>
            <p className="card-subtitle">
              Create clean summary notes from the selected PDF.
            </p>

            <button onClick={summarizePDF}>
              {loading === "summary" ? "Generating..." : "Generate Notes"}
            </button>
          </div>
        </section>

        <section className="card wide" id="ask">
          <h2>Ask Questions</h2>
          <p className="card-subtitle">
            Ask anything from the selected PDF and get source-backed answers.
          </p>

          <div className="input-row">
            <input
              type="text"
              placeholder="Example: Explain paging in operating systems..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />

            <button onClick={askQuestion}>
              {loading === "ask" ? "Thinking..." : "Ask"}
            </button>
          </div>
        </section>

        {activePDF?.chatHistory?.length > 0 && (
          <section className="history">
            <h2>Q&A History for {activePDF.name}</h2>

            {activePDF.chatHistory.map((chat, index) => (
              <div className="chat-card" key={index}>
                <div className="question-bubble">Q: {chat.question}</div>

                <div className="answer-bubble">A: {chat.answer}</div>

                {chat.sources.length > 0 && (
                  <div className="sources">
                    <h3>Sources Used</h3>

                    {chat.sources.map((source, idx) => (
                      <div className="source-card" key={idx}>
                        <div className="source-meta">
                          <span>Page {source.page}</span>
                          <span>{source.source}</span>
                        </div>

                        <p>{source.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {activePDF?.notes && (
          <section className="notes-card" id="summary">
            <div className="notes-header">
              <h2>PDF Notes for {activePDF.name}</h2>

              <button
                onClick={() =>
                  downloadTextFile(activePDF.notes, `${activePDF.name}-notes.txt`)
                }
              >
                Download Notes
              </button>
            </div>

            <div className="formatted-notes">
              {renderFormattedNotes(activePDF.notes)}
            </div>
          </section>
        )}

        <section className="card wide" id="youtube">
          <h2>YouTube to Notes</h2>
          <p className="card-subtitle">
            Paste a YouTube link and generate structured study notes.
          </p>

          <div className="input-row">
            <input
              type="text"
              placeholder="Paste YouTube URL..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
            />

            <button onClick={generateYoutubeNotes}>
              {loading === "youtube" ? "Generating..." : "Generate"}
            </button>
          </div>
        </section>

        {activeYoutube?.notes && (
          <section className="notes-card">
            <div className="notes-header">
              <h2>YouTube Notes</h2>

              <button
                onClick={() =>
                  downloadTextFile(activeYoutube.notes, "youtube-notes.txt")
                }
              >
                Download Notes
              </button>
            </div>

            <p className="video-url">{activeYoutube.url}</p>

            <div className="formatted-notes">
              {renderFormattedNotes(activeYoutube.notes)}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;