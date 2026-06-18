import { useState } from "react";
import axios from "axios";
import "./index.css";

const API = "http://127.0.0.1:8000";

function App() {
  const [pdf, setPdf] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
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

  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState("");
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const savePDFs = (updatedPDFs) => {
    setUploadedPDFs(updatedPDFs);
    localStorage.setItem("uploadedPDFs", JSON.stringify(updatedPDFs));
  };

  const saveYoutubeHistory = (updatedHistory) => {
    setYoutubeHistory(updatedHistory);
    localStorage.setItem("youtubeHistory", JSON.stringify(updatedHistory));
  };

  const updatePDFInHistory = (updatedPDF) => {
    const updatedPDFs = uploadedPDFs.map((file) =>
      file.id === updatedPDF.id ? updatedPDF : file
    );

    savePDFs(updatedPDFs);
    setActivePDF(updatedPDF);
    localStorage.setItem("activePDF", JSON.stringify(updatedPDF));
  };

  const clearTemporaryInputs = () => {
    setPdf(null);
    setQuestion("");
    setYoutubeUrl("");
    setFileInputKey(Date.now());
  };

  const resetQuizUI = () => {
    setCurrentQuizIndex(0);
    setSelectedOption("");
    setScore(0);
    setShowResult(false);
  };

  const applyQuizState = (file) => {
    const savedQuiz = file.quizState || {
      currentQuizIndex: 0,
      selectedOption: "",
      score: 0,
      showResult: false,
    };

    setCurrentQuizIndex(savedQuiz.currentQuizIndex || 0);
    setSelectedOption(savedQuiz.selectedOption || "");
    setScore(savedQuiz.score || 0);
    setShowResult(savedQuiz.showResult || false);
  };

  const selectPDF = (file) => {
    setActivePDF(file);
    setActiveYoutube(null);

    clearTemporaryInputs();

    localStorage.setItem("activePDF", JSON.stringify(file));
    localStorage.removeItem("activeYoutube");

    applyQuizState(file);
  };

  const selectYoutube = (video) => {
    setActiveYoutube(video);
    setActivePDF(null);

    clearTemporaryInputs();
    resetQuizUI();

    localStorage.setItem("activeYoutube", JSON.stringify(video));
    localStorage.removeItem("activePDF");
  };
  const deletePDF = (id, event) => {
  event.stopPropagation();

  const updatedPDFs = uploadedPDFs.filter((file) => file.id !== id);
  savePDFs(updatedPDFs);

  if (activePDF?.id === id) {
    setActivePDF(null);
    localStorage.removeItem("activePDF");
    clearTemporaryInputs();
    resetQuizUI();
  }
};

const deleteYoutube = (id, event) => {
  event.stopPropagation();

  const updatedHistory = youtubeHistory.filter((video) => video.id !== id);
  saveYoutubeHistory(updatedHistory);

  if (activeYoutube?.id === id) {
    setActiveYoutube(null);
    localStorage.removeItem("activeYoutube");
    clearTemporaryInputs();
  }
};

  const newChat = () => {
    setActivePDF(null);
    setActiveYoutube(null);

    clearTemporaryInputs();
    resetQuizUI();

    localStorage.removeItem("activePDF");
    localStorage.removeItem("activeYoutube");
  };

  const updateQuestionDraft = (value) => {
    if (!activePDF) {
      setQuestion(value);
      return;
    }

    const updatedPDF = {
      ...activePDF,
      questionDraft: value,
    };

    updatePDFInHistory(updatedPDF);
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
      "MULTIPLE CHOICE QUESTIONS",
      "TRUE/FALSE QUESTIONS",
      "SHORT ANSWER QUESTIONS",
      "ANSWERS",
      "QUIZ",
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
    const cleanedContent =
      typeof content === "string"
        ? content
            .replaceAll("#", "")
            .replaceAll("*", "")
            .replaceAll("•", "")
            .replaceAll("-", "")
        : JSON.stringify(content, null, 2);

    const blob = new Blob([cleanedContent], { type: "text/plain" });
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
        quiz: [],
        quizState: {
          currentQuizIndex: 0,
          selectedOption: "",
          score: 0,
          showResult: false,
        },
        questionDraft: "",
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

    const currentQuestion = activePDF.questionDraft || "";

    if (!currentQuestion.trim()) return;

    try {
      setLoading("ask");

      const res = await axios.post(`${API}/ask`, {
        question: currentQuestion,
        document_id: activePDF.document_id,
      });

      const newChat = {
        question: currentQuestion,
        answer: res.data.answer,
        sources: res.data.sources || [],
        askedAt: new Date().toLocaleString(),
      };

      const updatedPDF = {
        ...activePDF,
        questionDraft: "",
        chatHistory: [newChat, ...(activePDF.chatHistory || [])],
      };

      updatePDFInHistory(updatedPDF);
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

  if (activePDF.notes) {
    alert("Notes are already generated for this PDF.");
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

    updatePDFInHistory(updatedPDF);
  } catch (error) {
    console.error(error);
    alert("PDF notes generation failed.");
  } finally {
    setLoading("");
  }
};
  const generateQuiz = async () => {
  if (!activePDF) {
    alert("Please select or upload a PDF first.");
    return;
  }

  if (activePDF.quiz && activePDF.quiz.length > 0) {
    alert("Quiz is already generated for this PDF.");
    return;
  }

  try {
    setLoading("quiz");

    const res = await axios.post(`${API}/generate-quiz`, {
      document_id: activePDF.document_id,
    });

    const freshQuizState = {
      currentQuizIndex: 0,
      selectedOption: "",
      score: 0,
      showResult: false,
    };

    const updatedPDF = {
      ...activePDF,
      quiz: res.data.quiz,
      quizState: freshQuizState,
    };

    updatePDFInHistory(updatedPDF);

    setCurrentQuizIndex(0);
    setSelectedOption("");
    setScore(0);
    setShowResult(false);
  } catch (error) {
    console.error(error);
    alert("Quiz generation failed. Check backend terminal.");
  } finally {
    setLoading("");
  }
};
  const handleSelectOption = (option) => {
    if (showResult) return;

    setSelectedOption(option);

    updateQuizState({
      currentQuizIndex,
      selectedOption: option,
      score,
      showResult: false,
    });
  };

  const handleSubmitAnswer = () => {
    if (!selectedOption) {
      alert("Select an option first.");
      return;
    }

    const correctAnswer = activePDF.quiz[currentQuizIndex].answer;
    const isCorrect = selectedOption === correctAnswer;

    const newScore = isCorrect ? score + 1 : score;

    setScore(newScore);
    setShowResult(true);

    updateQuizState({
      currentQuizIndex,
      selectedOption,
      score: newScore,
      showResult: true,
    });
  };

  const handleNextQuestion = () => {
    const nextIndex = currentQuizIndex + 1;

    setCurrentQuizIndex(nextIndex);
    setSelectedOption("");
    setShowResult(false);

    updateQuizState({
      currentQuizIndex: nextIndex,
      selectedOption: "",
      score,
      showResult: false,
    });
  };

  const restartQuiz = () => {
    const freshQuizState = {
      currentQuizIndex: 0,
      selectedOption: "",
      score: 0,
      showResult: false,
    };

    setCurrentQuizIndex(0);
    setSelectedOption("");
    setScore(0);
    setShowResult(false);

    updateQuizState(freshQuizState);
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
    setFileInputKey(Date.now());
    resetQuizUI();

    alert("History cleared.");
  };
  const deleteQuestion = (questionIndex) => {
  if (!activePDF) return;

  const updatedChatHistory = activePDF.chatHistory.filter(
    (_, index) => index !== questionIndex
  );

  const updatedPDF = {
    ...activePDF,
    chatHistory: updatedChatHistory,
  };

  updatePDFInHistory(updatedPDF);
};

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">📚 StudyAI</div>

        <button className="new-chat-btn" onClick={newChat}>
          + New Chat
        </button>

        <nav>
          <a href="#upload">Upload PDF</a>
          <a href="#ask">Ask Questions</a>
          <a href="#summary">PDF Notes</a>
          <a href="#quiz">Quiz Generator</a>
          <a href="#youtube">YouTube Notes</a>
        </nav>

        <div className="pdf-list">
          <h3>PDF History</h3>

          {uploadedPDFs.length === 0 ? (
            <p className="muted">No PDFs uploaded yet</p>
          ) : (
           uploadedPDFs.map((file) => (
  <div
    className={
      activePDF?.id === file.id
        ? "history-item active-history"
        : "history-item"
    }
    key={file.id}
    onClick={() => selectPDF(file)}
  >
    <div>
      <span>📄 {file.name}</span>
      <small>{file.chunks} chunks</small>
    </div>

    <button
      className="delete-chat-btn"
      onClick={(e) => deletePDF(file.id, e)}
      title="Delete chat"
    >
      🗑️
    </button>
  </div>
))
          )}
        </div>

        <div className="pdf-list">
          <h3>YouTube History</h3>

          {youtubeHistory.length === 0 ? (
            <p className="muted">No videos yet</p>
          ) : (
            youtubeHistory.map((video) => (
  <div
    className={
      activeYoutube?.id === video.id
        ? "history-item active-history"
        : "history-item"
    }
    key={video.id}
    onClick={() => selectYoutube(video)}
  >
    <div>
      <span>▶️ YouTube Notes</span>
      <small>{video.generatedAt}</small>
    </div>

    <button
      className="delete-chat-btn"
      onClick={(e) => deleteYoutube(video.id, e)}
      title="Delete chat"
    >
      🗑️
    </button>
  </div>
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
            Ask questions, generate notes, create quizzes, and view
            source-backed answers from your uploaded content.
          </p>
        </section>

        {!activePDF && !activeYoutube && (
          <section className="active-card">
            <h2>New Chat</h2>
            <p>
              Upload a PDF or generate YouTube notes. Your old PDFs and videos
              will stay preserved in the sidebar history.
            </p>
          </section>
        )}

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
                key={fileInputKey}
                type="file"
                accept=".pdf"
                onChange={(e) => setPdf(e.target.files[0])}
              />
              <span>
  {pdf ? pdf.name : activePDF ? activePDF.name : "Choose a PDF file"}
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

          <div className="card" id="quiz">
            <h2>Generate Quiz</h2>
            <p className="card-subtitle">
              Create an interactive MCQ quiz from the selected PDF.
            </p>

            <button onClick={generateQuiz}>
              {loading === "quiz" ? "Generating..." : "Generate Quiz"}
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
              value={activePDF ? activePDF.questionDraft || "" : question}
              onChange={(e) => updateQuestionDraft(e.target.value)}
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

    <button
      className="delete-question-btn"
      onClick={() => deleteQuestion(index)}
    >
      🗑
    </button>

    <div className="question-bubble">
      Q: {chat.question}
    </div>

    <div className="answer-bubble">
      A: {chat.answer}
    </div>

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

        {Array.isArray(activePDF?.quiz) && activePDF.quiz.length > 0 && (
          <section className="quiz-card-modern" id="quiz">
            <div className="quiz-top">
              <div>
                <h2>Quiz for {activePDF.name}</h2>
                <p>
                  Question {currentQuizIndex + 1} of {activePDF.quiz.length}
                </p>
              </div>

              <div className="quiz-score-box">
                Score: {score} / {activePDF.quiz.length}
              </div>
            </div>

            <div className="quiz-progress">
              <div
                className="quiz-progress-fill"
                style={{
                  width: `${
                    ((currentQuizIndex + 1) / activePDF.quiz.length) * 100
                  }%`,
                }}
              ></div>
            </div>

            <h3 className="quiz-question-modern">
              {activePDF.quiz[currentQuizIndex].question}
            </h3>

            <div className="quiz-options-list">
              {activePDF.quiz[currentQuizIndex].options.map((option, index) => {
                const correct = activePDF.quiz[currentQuizIndex].answer;

                let className = "quiz-option-line";

                if (selectedOption === option && !showResult) {
                  className += " selected-option";
                }

                if (showResult && option === correct) {
                  className += " correct-option";
                }

                if (
                  showResult &&
                  selectedOption === option &&
                  option !== correct
                ) {
                  className += " wrong-option";
                }

                return (
                  <button
                    key={index}
                    className={className}
                    disabled={showResult}
                    onClick={() => handleSelectOption(option)}
                  >
                    <span className="option-letter">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>

            {showResult && (
              <div
                className={
                  selectedOption === activePDF.quiz[currentQuizIndex].answer
                    ? "quiz-feedback correct-feedback"
                    : "quiz-feedback wrong-feedback"
                }
              >
                {selectedOption === activePDF.quiz[currentQuizIndex].answer ? (
                  <p>Correct answer!</p>
                ) : (
                  <p>
                    Wrong answer. Correct answer is:{" "}
                    <strong>{activePDF.quiz[currentQuizIndex].answer}</strong>
                  </p>
                )}
              </div>
            )}

            <div className="quiz-actions">
              {!showResult ? (
                <button onClick={handleSubmitAnswer}>Submit Answer</button>
              ) : currentQuizIndex < activePDF.quiz.length - 1 ? (
                <button onClick={handleNextQuestion}>Next Question</button>
              ) : (
                <div className="final-score-card">
                  <h2>
                    Final Score: {score} / {activePDF.quiz.length}
                  </h2>
                  <button onClick={restartQuiz}>Restart Quiz</button>
                </div>
              )}
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