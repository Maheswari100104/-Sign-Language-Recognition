
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./HearingDashboard.css";

export default function HearingDashboard({ user, onLogout }) {
  const navigate = useNavigate();

  const [activePage, setActivePage] = useState("voice");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [history, setHistory] = useState([]);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");

  const recognitionRef = useRef(null);
  const listeningRef = useRef(false);

  const SpeechRecognition =
    typeof window !== "undefined"
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const speechSupported = Boolean(SpeechRecognition);

  const displayName =
    user?.full_name ||
    user?.name ||
    user?.email?.split("@")[0] ||
    "Hearing User";

  // Keep listening state synchronized with event handlers.
  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  // Stop recognition when the user leaves this dashboard.
  useEffect(() => {
    return () => {
      listeningRef.current = false;

      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;

        try {
          recognitionRef.current.abort();
        } catch {
          // Recognition may already have stopped.
        }

        recognitionRef.current = null;
      }
    };
  }, []);

  function startListening() {
    if (recognitionRef.current || listeningRef.current) {
      return;
    }

    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
      setMessage(
        "Speech recognition is not supported in this browser. Please try Chrome."
      );
      return;
    }

    const recognition = new Recognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;

    setInterimTranscript("");
    setMessage("Starting microphone...");

    recognition.onstart = () => {
      listeningRef.current = true;
      setListening(true);
      setMessage("Listening... Speak clearly.");
    };

    recognition.onresult = (event) => {
      let finalizedText = "";
      let temporaryText = "";

      // Only process results supplied by this event.
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const recognizedText = result[0].transcript.trim();

        if (!recognizedText) continue;

        if (result.isFinal) {
          finalizedText += recognizedText + " ";
        } else {
          temporaryText += recognizedText;
        }
      }

      // Save finalized speech separately from temporary speech.
      if (finalizedText) {
        setTranscript((previous) => previous + finalizedText);
      }

      // Temporary results replace one another instead of accumulating.
      setInterimTranscript(temporaryText);
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted") return;

      if (event.error === "no-speech") {
        setMessage("No speech detected. Please speak clearly.");
      } else if (event.error === "not-allowed") {
        setMessage(
          "Microphone access was denied. Allow microphone access in your browser settings."
        );
      } else {
        setMessage(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }

      listeningRef.current = false;
      setListening(false);
      setInterimTranscript("");
    };

    try {
      recognition.start();
    } catch (error) {
      recognitionRef.current = null;
      listeningRef.current = false;
      setListening(false);
      setMessage("Could not start listening. Please try again.");
    }
  }

  function stopListening() {
    const recognition = recognitionRef.current;

    if (!recognition) {
      setListening(false);
      setInterimTranscript("");
      return;
    }

    setMessage("Stopping microphone...");

    try {
      recognition.stop();
    } catch {
      recognitionRef.current = null;
      listeningRef.current = false;
      setListening(false);
      setInterimTranscript("");
    }
  }

  async function copyTranscript() {
    // Copy only finalized text, not temporary recognition results.
    const textToCopy = transcript.trim();

    if (!textToCopy) {
      setMessage("There is no finalized transcript to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setMessage("Transcript copied successfully.");
    } catch {
      setMessage(
        "Copy failed. Please select and copy the text manually."
      );
    }
  }

  function saveHistory() {
    const textToSave = transcript.trim();

    if (!textToSave) {
      setMessage("Enter or dictate some text before saving.");
      return;
    }

    const record = {
      id: Date.now(),
      text: textToSave,
      createdAt: new Date().toLocaleString(),
    };

    setHistory((previous) => [record, ...previous]);
    setMessage("Transcript saved in this session.");
  }

  function clearTranscript() {
    setTranscript("");
    setInterimTranscript("");
    setMessage("");
  }

  function openHistoryRecord(record) {
    stopListening();
    setTranscript(record.text);
    setInterimTranscript("");
    setActivePage("voice");
    setMessage("Saved transcript opened.");
  }

  const navItems = [
    { id: "workspace", icon: "▦", label: "Workspace" },
    { id: "voice", icon: "♩", label: "Voice to Text" },
    { id: "history", icon: "◷", label: "Text History" },
  ];

  const pageTitle =
    activePage === "history"
      ? "Text History"
      : activePage === "workspace"
        ? "Communication Workspace"
        : "Voice to Text";

  return (
    <div className="hearing-workspace">
      <aside className="hearing-sidebar">
        <div className="hearing-sidebar-brand">
          <div className="hearing-logo">S</div>

          <div>
            <strong>Signora</strong>
            <span>COMMUNICATION AI</span>
          </div>
        </div>

        <p className="hearing-sidebar-label">WORKSPACE</p>

        <nav className="hearing-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`hearing-nav-item ${
                activePage === item.id ? "active" : ""
              }`}
              onClick={() => {
                setActivePage(item.id);
                setMessage("");
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}

        
        </nav>

        <div className="hearing-sidebar-bottom">
          <div className="hearing-sidebar-promo">
            <span>✦</span>
            <strong>Communication for everyone.</strong>
            <p>
              Turn spoken words into meaningful messages.
            </p>
          </div>

          <div className="hearing-sidebar-user">
            <div className="hearing-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>{displayName}</strong>
              <span>{user?.email || "Hearing User"}</span>
            </div>
          </div>

          <button
            type="button"
            className="hearing-signout"
            onClick={() => {
              stopListening();
              onLogout?.();
            }}
          >
            ↪ &nbsp; Sign out
          </button>
        </div>
      </aside>

      <main className="hearing-main">
        <header className="hearing-topbar">
          <div>
            Workspace <span>/</span> {pageTitle}
          </div>

          <span className="hearing-online">
            <i /> Communication workspace
          </span>
        </header>

        <section className="hearing-page-heading">
          <div>
            <p className="hearing-eyebrow">
              YOUR COMMUNICATION SPACE
            </p>

            <h1>{pageTitle}</h1>

            <p>
              {activePage === "history"
                ? "Review transcripts saved during this session."
                : "Capture spoken words and make communication easier."}
            </p>
          </div>

          <button
            type="button"
            className="hearing-reset-button"
            onClick={clearTranscript}
          >
            ↻ Reset workspace
          </button>
        </section>

        <section className="hearing-status-grid">
          <div className="hearing-status-card">
            <span className="hearing-status-icon purple">◎</span>

            <div>
              <small>MICROPHONE STATUS</small>
              <strong>
                {listening ? "Listening" : "Not listening"}
              </strong>
            </div>
          </div>

          <div className="hearing-status-card">
            <span className="hearing-status-icon blue">Aa</span>

            <div>
              <small>MESSAGE LENGTH</small>
              <strong>{transcript.length} characters</strong>
            </div>
          </div>

          <div className="hearing-status-card">
            <span className="hearing-status-icon orange">✦</span>

            <div>
              <small>SPEECH RECOGNITION</small>
              <strong>
                {speechSupported ? "Available" : "Not supported"}
              </strong>
            </div>
          </div>
        </section>

        {activePage === "history" ? (
          <section className="hearing-panel">
            <h2>Saved transcripts</h2>

            <p className="hearing-panel-description">
              Transcripts saved during this browser session.
            </p>

            {history.length === 0 ? (
              <div className="hearing-empty">
                No saved transcripts yet. Dictate some text and select
                "Save to history".
              </div>
            ) : (
              history.map((record) => (
                <article
                  className="hearing-history-item"
                  key={record.id}
                >
                  <small>{record.createdAt}</small>
                  <p>{record.text}</p>

                  <button
                    type="button"
                    onClick={() => openHistoryRecord(record)}
                  >
                    Open transcript
                  </button>
                </article>
              ))
            )}
          </section>
        ) : (
          <section className="hearing-panel">
            <div className="hearing-panel-heading">
              <div>
                <p className="hearing-step">
                  TWO-WAY COMMUNICATION
                </p>

                <h2>
                  {activePage === "workspace"
                    ? "Communication Workspace"
                    : "Voice to Text"}
                </h2>

                <p className="hearing-panel-description">
                  Let a hearing person speak and display their words
                  for a sign-language user to read.
                </p>
              </div>

              <span className="hearing-ready">
                {listening ? "LISTENING" : "READY"}
              </span>
            </div>

            <div className="hearing-instruction">
              Select Start listening, allow microphone access, and
              speak clearly. You can also type directly into the box.
            </div>

            <label
              className="hearing-field-label"
              htmlFor="hearing-transcript"
            >
              RECOGNIZED SPEECH
            </label>

            <textarea
              id="hearing-transcript"
              className="hearing-transcript"
              value={transcript + interimTranscript}
              onChange={(event) => {
                setTranscript(event.target.value);
                setInterimTranscript("");
              }}
              placeholder="The hearing person's spoken words will appear here. You can also edit the transcript."
            />

            {message && (
              <p className="hearing-message" role="status">
                {message}
              </p>
            )}

            <div className="hearing-actions">
              {listening ? (
                <button
                  type="button"
                  className="hearing-primary-button"
                  onClick={stopListening}
                >
                  ■ Stop listening
                </button>
              ) : (
                <button
                  type="button"
                  className="hearing-primary-button"
                  onClick={startListening}
                >
                  ♩ Start listening
                </button>
              )}

              <button
                type="button"
                className="hearing-outline-button"
                onClick={copyTranscript}
              >
                Copy transcript
              </button>

              <button
                type="button"
                className="hearing-outline-button"
                onClick={saveHistory}
              >
                Save to history
              </button>

              <button
                type="button"
                className="hearing-outline-button"
                onClick={clearTranscript}
              >
                Clear transcript
              </button>
            </div>

            <p className="hearing-footnote">
              ✧ Uses your browser's Speech Recognition API. Temporary
              recognition text is displayed separately from finalized
              speech. History currently lasts for this session and is
              not saved to the database.
            </p>
          </section>
        )}

        <footer className="hearing-footer">
          Signora · Accessible communication through technology
        </footer>
      </main>
    </div>
  );
}
