import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

export default function Dashboard({ user, onLogout }) {

  const navigate = useNavigate();

  const videoRef = useRef(null);

  const canvasRef = useRef(null);

  const streamRef = useRef(null);

  const stableLetterRef = useRef("");

  const stableCountRef = useRef(0);

  const lastSentLetterRef = useRef("");

  const lastSentAtRef = useRef(0);



  const [cameraOn, setCameraOn] = useState(false);

  const [text, setText] = useState("");

  const [sentence, setSentence] = useState("");

  const [history, setHistory] = useState([]);

  const [activeTab, setActiveTab] = useState("Workspace");

  const [notice, setNotice] = useState("");

  const [prediction, setPrediction] = useState({

    letter: "—",

    confidence: 0,

  });

  const [recognitionStatus, setRecognitionStatus] =

    useState("Not connected");



  

  // Browser speech recognition for the hearing person's voice-to-text reply.
  const [voiceText, setVoiceText] = useState("");
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("Ready");
  const speechRecognitionRef = useRef(null);
function getAccessToken() {
    return (
      localStorage.getItem("dsignora_access_token") ||
      sessionStorage.getItem("dsignora_access_token") ||
      ""
    );
  }

  async function loadHistory() {
    const token = getAccessToken();
    if (!token) {
      setHistory([]);
      setNotice("Please sign in again to view your saved SQL history.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/history`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => []);
      if (response.status === 401) {
        throw new Error("Your session has expired. Please sign in again.");
      }
      if (!response.ok) {
        throw new Error(data.detail || `Could not load history (${response.status}).`);
      }

      const rows = Array.isArray(data) ? data : (data.history || []);
      setHistory(rows);
    } catch (error) {
      console.error("Load history error:", error);
      setNotice(error.message || "Could not load translation history from the database.");
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function saveHistoryEntry(originalText, correctedText) {
    const token = getAccessToken();
    if (!token) {
      throw new Error("Your login session is missing. Please sign in again before saving history.");
    }

    const response = await fetch(`${API_URL}/history`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        original_text: originalText,
        corrected_text: correctedText,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error("Your session has expired. Please sign in again.");
    }
    if (!response.ok) {
      throw new Error(data.detail || `Could not save history (${response.status}).`);
    }
    await loadHistory();
  }

  async function startCamera() {

    try {

      const stream = await navigator.mediaDevices.getUserMedia({

        video: { width: 640, height: 480 },

        audio: false,

      });



      streamRef.current = stream;

      videoRef.current.srcObject = stream;

      await videoRef.current.play();



      stableLetterRef.current = "";

      stableCountRef.current = 0;

      lastSentLetterRef.current = "";

      lastSentAtRef.current = 0;



      setCameraOn(true);

      setRecognitionStatus("Connecting");

      setNotice("Camera started. Connecting to the Python model...");

    } catch (error) {

      console.error("Camera error:", error);

      setNotice(

        "Camera access failed. Allow camera access in your browser."

      );

    }

  }



  function stopCamera() {

    streamRef.current?.getTracks().forEach((track) => track.stop());

    streamRef.current = null;



    if (videoRef.current) {

      videoRef.current.srcObject = null;

    }



    setCameraOn(false);

    setRecognitionStatus("Stopped");

    setPrediction({ letter: "—", confidence: 0 });

    setNotice("Camera stopped.");

  }


  useEffect(() => {

    if (!cameraOn) return;



    let active = true;

    let busy = false;

    let timer;



    async function recognizeFrame() {

      const video = videoRef.current;

      const canvas = canvasRef.current;



      if (

        !active ||

        busy ||

        !video ||

        !canvas ||

        video.readyState < 2

      ) {

        return;

      }



      busy = true;



      try {

        canvas.width = video.videoWidth;

        canvas.height = video.videoHeight;



        const context = canvas.getContext("2d");

        context.drawImage(video, 0, 0, canvas.width, canvas.height);



        const blob = await new Promise((resolve) =>

          canvas.toBlob(resolve, "image/jpeg", 0.8)

        );



        if (!blob || !active) return;



        const response = await fetch(`${API_URL}/predict`, {

          method: "POST",

          headers: { "Content-Type": "image/jpeg" },

          body: blob,

        });



        if (!response.ok) {

          throw new Error(`Prediction API error: ${response.status}`);

        }



        const result = await response.json();

        if (!active) return;



        setRecognitionStatus("Connected");



        if (!result.hand_detected || !result.letter) {

          setPrediction({ letter: "—", confidence: 0 });

          stableLetterRef.current = "";

          stableCountRef.current = 0;

          lastSentLetterRef.current = "";

          return;

        }



        const letter = String(result.letter).trim();



        setPrediction({

          letter,

          confidence: result.confidence ?? 0,

        });



        if (letter === stableLetterRef.current) {

          stableCountRef.current += 1;

        } else {

          stableLetterRef.current = letter;

          stableCountRef.current = 1;

        }



        // Require three consecutive matching predictions.

        // Allow the same letter again after a short pause.

        const now = Date.now();

        const sameLetterCooldown =

          now - lastSentAtRef.current > 1200;



        if (

          stableCountRef.current >= 3 &&

          letter !== lastSentLetterRef.current &&

          letter.length > 0

        ) {

          setText((current) => current + letter);

          lastSentLetterRef.current = letter;

          lastSentAtRef.current = now;

        } else if (

          stableCountRef.current >= 3 &&

          letter === lastSentLetterRef.current &&

          sameLetterCooldown

        ) {

          setText((current) => current + letter);

          lastSentAtRef.current = now;

        }

      } catch (error) {

        console.error("Recognition error:", error);

        if (active) {

          setRecognitionStatus("Connection error");

          setNotice(

            "Cannot reach the Python API. Check that FastAPI is running on port 8000."

          );

        }

      } finally {

        busy = false;

      }

    }



    timer = window.setInterval(recognizeFrame, 400);



    return () => {

      active = false;

      window.clearInterval(timer);

    };

  }, [cameraOn]);



  useEffect(() => {

    return () => {

      streamRef.current?.getTracks().forEach((track) => track.stop());

      window.speechSynthesis?.cancel();
      try {
        speechRecognitionRef.current?.stop();
      } catch {
        // Recognition may already be stopped.
      }

    };

  }, []);
  function startVoiceRecognition() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceStatus("Not supported");
      setNotice("Speech recognition is not supported in this browser. Try the latest Google Chrome or Microsoft Edge.");
      return;
    }

    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch { /* already stopped */ }
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setVoiceListening(true);
      setVoiceStatus("Listening");
      setNotice("Listening to the hearing person's voice...");
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += transcript;
        else interimTranscript += transcript;
      }
      if (finalTranscript) {
        setVoiceText((current) =>
          `${current}${current.trim() ? " " : ""}${finalTranscript.trim()}`.trim()
        );
      }
      setVoiceStatus(interimTranscript ? `Recognizing: ${interimTranscript}` : "Listening");
    };

    recognition.onerror = (event) => {
      setVoiceListening(false);
      setVoiceStatus("Error");
      const message = event.error === "not-allowed"
        ? "Microphone permission was denied. Allow microphone access in your browser."
        : event.error === "no-speech"
        ? "No speech was detected. Try speaking closer to the microphone."
        : `Speech recognition error: ${event.error}`;
      setNotice(message);
    };

    recognition.onend = () => {
      setVoiceListening(false);
      setVoiceStatus("Stopped");
    };

    speechRecognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (error) {
      setVoiceListening(false);
      setVoiceStatus("Could not start");
      setNotice("Could not start speech recognition. Please try again.");
      console.error("Speech recognition start error:", error);
    }
  }

  function stopVoiceRecognition() {
    try { speechRecognitionRef.current?.stop(); }
    catch (error) { console.error("Speech recognition stop error:", error); }
    setVoiceListening(false);
    setVoiceStatus("Stopped");
  }

  function clearVoiceText() {
    setVoiceText("");
    setNotice("Voice transcript cleared.");
  }

  async function copyVoiceText() {
    if (!voiceText.trim()) {
      setNotice("There is no recognized speech to copy yet.");
      return;
    }
    try {
      await navigator.clipboard.writeText(voiceText);
      setNotice("Recognized speech copied successfully.");
    } catch {
      setNotice("Clipboard unavailable. Select the transcript and copy it manually.");
    }
  }


  async function saveVoiceTranscript() {
    const transcript = voiceText.trim();
    if (!transcript) {
      setNotice("Recognize or enter speech before saving it to history.");
      return;
    }

    const taggedOriginal = `[Voice-to-text] ${transcript}`;
    try {
      await saveHistoryEntry(taggedOriginal, transcript);
      setNotice("Voice transcript saved to your SQL history.");
    } catch (error) {
      console.error("Save voice transcript error:", error);
      setNotice(error instanceof Error ? error.message : "Could not save voice transcript.");
    }
  }

  function clearAll() {

    setText("");

    setSentence("");

    setNotice("");

    lastSentLetterRef.current = "";

    stableLetterRef.current = "";

    stableCountRef.current = 0;

    lastSentAtRef.current = 0;

  }



  function deleteLast() {

    setText((value) => value.slice(0, -1));

  }



  async function copyText() {

    if (!text.trim()) {

      setNotice("Enter some text before copying.");

      return;

    }



    try {

      await navigator.clipboard.writeText(text);

      setNotice("Text copied successfully.");

    } catch {

      setNotice("Clipboard unavailable. Select the text and copy it manually.");

    }

  }



  function speakText() {

    if (!text.trim()) {

      setNotice("Enter some text before using speech.");

      return;

    }



    if (!("speechSynthesis" in window)) {

      setNotice("Speech output is not supported by this browser.");

      return;

    }



    window.speechSynthesis.cancel();



    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = "en-US";

    utterance.rate = 0.9;

    utterance.onstart = () => setNotice("Speaking your message...");

    utterance.onend = () => setNotice("Speech finished.");

    utterance.onerror = () => setNotice("Unable to play speech.");



    window.speechSynthesis.speak(utterance);

  }



  async function generateSentence() {
    const rawText = text.trim();

    if (!rawText) {
      setNotice("Enter or recognize some text first.");
      return;
    }

    setSentence("");
    setNotice("Correcting your text with Ollama AI...");

    try {
      const response = await fetch(`${API_URL}/correct-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || `Text correction failed (${response.status}).`);
      }

      const corrected = String(data.corrected_text || "").trim();
      if (!corrected) {
        throw new Error("Ollama returned an empty correction.");
      }

      setSentence(corrected);
      setText(corrected);

      await saveHistoryEntry(rawText, corrected);
      setNotice("Text corrected successfully and saved to your SQL history.");
    } catch (error) {
      console.error("Ollama text correction error:", error);
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not connect to Ollama. Check that FastAPI and Ollama are running."
      );
    }
  }


  return (

    <div className="app-shell">

      <aside className="sidebar">

        <div className="logo">

          <div className="logo-symbol">S</div>

          <div>

            <strong>Signora</strong>

            <span>COMMUNICATION AI</span>

          </div>

        </div>



        <div className="nav-label">WORKSPACE</div>



        {[

          ["Workspace", "▦"],

          ["Live Recognition", "◎"],

          
          ["Voice to Text", "🎙"],
          ["Text History", "◷"],
        

        ].map(([label, icon]) => (

          <button

            key={label}

            className={`nav-item ${activeTab === label ? "active" : ""}`}

            onClick={() => {
              if (label === "Video Call") {
                navigate("/call");
                return;
              }

              setActiveTab(label);
              setNotice("");
            }}

          >

            <span>{icon}</span>

            {label}

          </button>

        ))}



        <div className="sidebar-bottom">

          <div className="help-card">

            <div className="help-icon">✦</div>

            <strong>Communication for everyone.</strong>

            <p>Turn hand signs into meaningful messages.</p>

          </div>



          <div className="profile">
            <div className="avatar">
              {(user?.full_name || user?.name || user?.email || "S")
                .trim()
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="profile-details">
              <strong>
                {user?.full_name ||
                  user?.name ||
                  user?.email?.split("@")[0] ||
                  "Sign Language User"}
              </strong>
              <span>{user?.email || "Personal workspace"}</span>
            </div>
          </div>

          <button
            type="button"
            className="nav-item"
            onClick={onLogout}
            title="Sign out of DSignora AI"
          >
            <span>↪</span>
            Sign out
          </button>

        </div>

      </aside>



      <main className="main-content">

        <header className="topbar">

          <div className="breadcrumb">

            Workspace <span>/</span> {activeTab}

          </div>

          <div className="system-status">

            <i />

            Recognition workspace

          </div>

        </header>



        <section className="page-heading">

          <div>

            <div className="eyebrow">YOUR COMMUNICATION SPACE</div>

            <h1>

              {activeTab === "Workspace"

                ? "Sign to speech workspace"

                : activeTab}

            </h1>

            <p>

              Capture signs, build your message, and express yourself

              with confidence.

            </p>

          </div>

          <button className="clear-button" onClick={clearAll}>

            ↻ Reset workspace

          </button>

        </section>



        <section className="metrics">

          <div className="metric-card">

            <div className="metric-icon purple">◎</div>

            <div>

              <span>CAMERA STATUS</span>

              <strong>{cameraOn ? "Connected" : "Not started"}</strong>

            </div>

            <div className={`metric-dot ${cameraOn ? "green-dot" : ""}`} />

          </div>



          <div className="metric-card">

            <div className="metric-icon blue">Aa</div>

            <div>

              <span>MESSAGE LENGTH</span>

              <strong>{text.length} characters</strong>

            </div>

          </div>



          <div className="metric-card">

            <div className="metric-icon orange">✦</div>

            <div>

              <span>MODEL STATUS</span>

              <strong>{recognitionStatus}</strong>

            </div>

          </div>

        </section>



        {activeTab === "Voice to Text" ? (
          <section className="card history-card" style={{ marginBottom: 24 }}>
            <div className="card-heading">
              <div>
                <div className="section-kicker">TWO-WAY COMMUNICATION</div>
                <h2>Voice to Text</h2>
                <p>Let a hearing person speak and display their words for the deaf user to read.</p>
              </div>
              <span className={`pill ${voiceListening ? "pill-live" : ""}`}>
                <i />
                {voiceListening ? "LISTENING" : voiceStatus.toUpperCase()}
              </span>
            </div>

            <div className="notice" role="status" style={{ marginBottom: 16 }}>
              Select Start listening, allow microphone access, and ask the speaker to speak clearly.
              Browser support varies; this works best in a supported browser such as Chrome.
            </div>

            <label className="field-label" htmlFor="voice-transcript">RECOGNIZED SPEECH</label>
            <textarea
              id="voice-transcript"
              value={voiceText}
              onChange={(event) => setVoiceText(event.target.value)}
              placeholder="The hearing person's spoken words will appear here. You can also edit the transcript."
              style={{ minHeight: 220, width: "100%", boxSizing: "border-box" }}
            />

            <div className="camera-buttons" style={{ marginTop: 14, flexWrap: "wrap" }}>
              {!voiceListening ? (
                <button type="button" className="primary-button" onClick={startVoiceRecognition}>
                  🎙 Start listening
                </button>
              ) : (
                <button type="button" className="stop-button" onClick={stopVoiceRecognition}>
                  ■ Stop listening
                </button>
              )}
              <button type="button" className="clear-button" onClick={copyVoiceText}>Copy transcript</button>
              <button type="button" className="clear-button" onClick={saveVoiceTranscript}>Save to history</button>
              <button type="button" className="clear-button" onClick={clearVoiceText}>Clear transcript</button>
            </div>

            <div className="privacy-note" style={{ marginTop: 18 }}>
              <span>✧</span>
              <p>
                Uses the browser Speech Recognition API to convert spoken words into editable text.
                Voice transcripts are not currently saved to SQL history.
              </p>
            </div>
            {notice && <div className="notice" role="status" style={{ marginTop: 14 }}>{notice}</div>}
          </section>
        ) : activeTab === "Text History" ? (
          <section className="card history-card" style={{ marginBottom: 24 }}>
            <div className="card-heading">
              <div>
                <div className="section-kicker">SAVED TRANSLATIONS</div>
                <h2>Text History</h2>
                <p>Sentences corrected by AI are saved here for later reference.</p>
              </div>
              <button type="button" className="clear-button" onClick={loadHistory}>
                ↻ Refresh history
              </button>
            </div>

            {history.length === 0 ? (
              <div className="notice" role="status">
                No saved translations found. Use “Correct text with AI” in your workspace, then refresh this list.
              </div>
            ) : (
              <div className="history-list" style={{ display: "grid", gap: 14 }}>
                {history.map((item) => (
                  <article key={item.id} className="metric-card" style={{ display: "block" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <span className="section-kicker">
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                      <span className="pill">
                        {String(item.original_text || "").startsWith("[Voice-to-text] ")
                          ? "VOICE TRANSCRIPT"
                          : "SAVED TO DATABASE"}
                      </span>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      {String(item.original_text || "").startsWith("[Voice-to-text] ") ? (
                        <>
                          <strong>Hearing person's speech (transcribed)</strong>
                          <p style={{ margin: "6px 0 0", overflowWrap: "anywhere" }}>
                            {String(item.original_text).slice("[Voice-to-text] ".length)}
                          </p>
                        </>
                      ) : (
                        <>
                          <strong>Original text</strong>
                          <p style={{ margin: "6px 0 12px", overflowWrap: "anywhere" }}>{item.original_text}</p>
                          <strong>Corrected sentence</strong>
                          <p style={{ margin: "6px 0 0", overflowWrap: "anywhere" }}>{item.corrected_text}</p>
                        </>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => {
                          setText(item.corrected_text);
                          setSentence(item.corrected_text);
                          setActiveTab("Workspace");
                          setNotice("Saved sentence loaded into your workspace.");
                        }}
                      >
                        Use sentence
                      </button>
                      <button
                        type="button"
                        className="clear-button"
                        onClick={() => {
                          navigator.clipboard.writeText(item.corrected_text)
                            .then(() => setNotice("Corrected sentence copied."))
                            .catch(() => setNotice("Could not access clipboard."));
                        }}
                      >
                        Copy sentence
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : (
        <section className="content-grid">

          <article className="card camera-card">

            <div className="card-heading">

              <div>

                <div className="section-kicker">STEP 01</div>

                <h2>Live recognition</h2>

                <p>Position your hand inside the camera view.</p>

              </div>

              <span className={`pill ${cameraOn ? "pill-live" : ""}`}>

                <i />

                {cameraOn ? "LIVE" : "STANDBY"}

              </span>

            </div>



            <div className="video-stage">

              <video
  ref={videoRef}
  className="camera-video"
  autoPlay
  playsInline
  muted
/>

              <canvas ref={canvasRef} hidden />



              {!cameraOn && (

                <div className="video-placeholder">

                  <div className="camera-art">⌁</div>

                  <strong>Your camera preview</strong>

                  <span>Start the camera to see yourself here.</span>

                </div>

              )}



              <div className="video-overlay top-left">

                <span />

                CAMERA FEED

              </div>



              {cameraOn && (

                <div className="video-overlay bottom-left">

                  {recognitionStatus} · Confidence {prediction.confidence}%

                </div>

              )}



              <div className="scan-corner corner-one" />

              <div className="scan-corner corner-two" />

              <div className="scan-corner corner-three" />

              <div className="scan-corner corner-four" />

            </div>



            <div className="camera-buttons">

              {!cameraOn ? (

                <button className="primary-button" onClick={startCamera}>

                  ◉ Start camera

                </button>

              ) : (

                <button className="stop-button" onClick={stopCamera}>

                  ■ Stop camera

                </button>

              )}

              <span className="camera-hint">

                Allow browser camera access

              </span>

            </div>



            <div className="prediction-box">

              <div>

                <span className="section-kicker">LATEST PREDICTION</span>

                <p>

                  {prediction.letter === "—"

                    ? "Show your hand to the camera"

                    : `Confidence: ${prediction.confidence}%`}

                </p>

              </div>

              <div className="prediction-letter">

                {prediction.letter}

              </div>

            </div>

          </article>



          <article className="card message-card">

            <div className="card-heading">

              <div>

                <div className="section-kicker">STEP 02</div>

                <h2>Build your message</h2>

                <p>Recognized letters will be collected here.</p>

              </div>

              <span className="number-badge">02</span>

            </div>



            <label className="field-label" htmlFor="message">

              YOUR TEXT

            </label>



            <textarea

              id="message"

              value={text}

              onChange={(event) => setText(event.target.value)}

              placeholder="Your recognized signs will appear here. You can also type or edit your message..."

            />



            <div className="editor-toolbar">

              <span>{text.length} characters</span>

              <div>

                <button onClick={() => setText((value) => value + " ")}>

                  + Space

                </button>

                <button onClick={deleteLast}>⌫ Delete</button>

                <button onClick={() => setText("")}>Clear</button>

                <button onClick={copyText}>Copy</button>

                <button onClick={speakText}>🔊 Speak</button>

              </div>

            </div>



            <div className="divider" />



            <div className="card-heading assistant-heading">

              <div>

                <div className="section-kicker">STEP 03</div>

                <h2>

                  <span className="sparkle">✦</span> Sentence assistant

                </h2>

                <p>Turn your text into a clear, natural sentence.</p>

              </div>

              <span className="ai-badge">AI</span>

            </div>



            <button

              className="primary-button generate-button"

              onClick={generateSentence}

            >

              ✦ Correct text with AI <span>→</span>

            </button>



            {sentence && (

              <div className="sentence-output">{sentence}</div>

            )}



            {notice && (

              <div className="notice" role="status">

                {notice}

              </div>

            )}



            <div className="privacy-note">

              <span>✧</span>

              <p>

                Predictions are supplied by your Python model.

                Ollama helps correct spelling and grammar in recognized text.

              </p>

            </div>

          </article>

        </section>
        )}



        <footer className="footer">

          <span>

            Signora <span className="footer-dot">·</span>

            Accessible communication through technology

          </span>

          <span>

            Frontend preview <span className="footer-dot">·</span> v1.0

          </span>

        </footer>

      </main>

    </div>

  );
}
