
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const SIGNALING_URL = "ws://127.0.0.1:8000";

export default function VideoCall({ user }) {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerRef = useRef(null);
  const socketRef = useRef(null);
  const makingOfferRef = useRef(false);
  const pendingCandidatesRef = useRef([]);

  const [status, setStatus] = useState("Preparing your camera...");
  const [connected, setConnected] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [error, setError] = useState("");
  const [remotePresent, setRemotePresent] = useState(false);

  const displayName =
    user?.full_name || user?.name || "You";

  const sendSignal = useCallback((message) => {
    const socket = socketRef.current;

    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }, []);

  const createPeerConnection = useCallback(() => {
    if (peerRef.current) return peerRef.current;

    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
      ],
    });

    const localStream = localStreamRef.current;

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        peer.addTrack(track, localStream);
      });
    }

    peer.ontrack = (event) => {
      const stream = event.streams?.[0];

      if (stream && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        setRemotePresent(true);
        setStatus("Connected to your participant");
      }
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: "ice-candidate",
          candidate: event.candidate,
        });
      }
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") {
        setConnected(true);
        setStatus("Call connected");
      } else if (peer.connectionState === "connecting") {
        setStatus("Connecting call...");
      } else if (
        peer.connectionState === "disconnected"
      ) {
        setConnected(false);
        setStatus("Connection interrupted. Waiting to reconnect...");
      } else if (peer.connectionState === "failed") {
        setConnected(false);
        setStatus("Connection failed. Try rejoining the room.");
      } else if (peer.connectionState === "closed") {
        setConnected(false);
      }
    };

    peerRef.current = peer;
    return peer;
  }, [sendSignal]);

  useEffect(() => {
    let cancelled = false;
    let socket;
    let peer;

    async function startCall() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Camera access is unavailable. Open the app on localhost or use HTTPS."
          );
        }

        const stream =
          await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        peer = createPeerConnection();

        socket = new WebSocket(
          `${SIGNALING_URL}/ws/call/${encodeURIComponent(roomId)}`
        );
        socketRef.current = socket;

        socket.onopen = () => {
          if (!cancelled) {
            setStatus("Waiting for another participant...");
          }
        };

        socket.onmessage = async (event) => {
          try {
            const message = JSON.parse(event.data);

            if (message.type === "joined") {
              setStatus(
                message.peer_present
                  ? "Participant found. Connecting..."
                  : "Room joined. Waiting for another participant..."
              );
            }

            if (message.type === "peer-joined") {
              setStatus("Participant joined. Starting call...");

              // The participant already in the room creates the offer.
              if (
                peerRef.current &&
                !makingOfferRef.current &&
                peerRef.current.signalingState === "stable"
              ) {
                try {
                  makingOfferRef.current = true;

                  const offer =
                    await peerRef.current.createOffer();

                  await peerRef.current.setLocalDescription(
                    offer
                  );

                  sendSignal({
                    type: "offer",
                    sdp: peerRef.current.localDescription,
                  });
                } finally {
                  makingOfferRef.current = false;
                }
              }
            }

            if (message.type === "offer") {
              const connection = peerRef.current;
              if (!connection) return;

              await connection.setRemoteDescription(
                new RTCSessionDescription(message.sdp)
              );

              const answer = await connection.createAnswer();

              await connection.setLocalDescription(answer);

              sendSignal({
                type: "answer",
                sdp: connection.localDescription,
              });

              for (const candidate of pendingCandidatesRef.current) {
                await connection.addIceCandidate(candidate);
              }
              pendingCandidatesRef.current = [];
            }

            if (message.type === "answer") {
              const connection = peerRef.current;
              if (!connection) return;

              await connection.setRemoteDescription(
                new RTCSessionDescription(message.sdp)
              );

              for (const candidate of pendingCandidatesRef.current) {
                await connection.addIceCandidate(candidate);
              }
              pendingCandidatesRef.current = [];
            }

            if (message.type === "ice-candidate") {
              const connection = peerRef.current;

              if (!connection || !message.candidate) return;

              const candidate = new RTCIceCandidate(
                message.candidate
              );

              if (connection.remoteDescription) {
                await connection.addIceCandidate(candidate);
              } else {
                pendingCandidatesRef.current.push(candidate);
              }
            }

            if (message.type === "peer-left") {
              setConnected(false);
              setRemotePresent(false);

              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = null;
              }

              setStatus("The other participant left the call.");
            }

            if (message.type === "room-full") {
              setError(
                "This room already has two participants. Use another room ID."
              );
              setStatus("Room is full");
            }

            if (message.type === "error") {
              setError(message.message || "Signaling error.");
            }
          } catch (err) {
            console.error("Call signaling error:", err);
            setError(
              "Could not establish the call. Please leave and rejoin."
            );
          }
        };

        socket.onerror = () => {
          if (!cancelled) {
            setError(
              "Could not connect to the call server. Check that FastAPI is running on port 8000."
            );
          }
        };

        socket.onclose = (event) => {
          if (!cancelled && event.code !== 1000) {
            setStatus("Call signaling disconnected.");
          }
        };
      } catch (err) {
        console.error("Could not start call:", err);

        if (!cancelled) {
          setError(
            err.name === "NotAllowedError"
              ? "Camera or microphone permission was denied. Allow access in your browser."
              : err.message || "Could not start the video call."
          );
          setStatus("Unable to start call");
        }
      }
    }

    startCall();

    return () => {
      cancelled = true;

      if (socket) {
        socket.onclose = null;
        socket.close(1000, "Leaving call");
      }

      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close(1000, "Leaving call");
        socketRef.current = null;
      }

      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }

      if (localStreamRef.current) {
        localStreamRef.current
          .getTracks()
          .forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    };
  }, [roomId, createPeerConnection, sendSignal]);

  function toggleMicrophone() {
    const stream = localStreamRef.current;
    if (!stream) return;

    const nextEnabled = !micEnabled;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = nextEnabled;
    });
    setMicEnabled(nextEnabled);
  }

  function toggleCamera() {
    const stream = localStreamRef.current;
    if (!stream) return;

    const nextEnabled = !cameraEnabled;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = nextEnabled;
    });
    setCameraEnabled(nextEnabled);
  }

  async function copyInvite() {
    const inviteUrl = `${window.location.origin}/call/${encodeURIComponent(roomId)}`;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setStatus("Invite link copied. Share it with your participant.");
    } catch {
      window.prompt("Copy this call link:", inviteUrl);
    }
  }

  function leaveCall() {
    navigate("/dashboard", { replace: true });
  }

  const panelStyle = {
    background: "#101827",
    border: "1px solid #29364b",
    borderRadius: 16,
    overflow: "hidden",
    minWidth: 0,
  };

  const videoStyle = {
    width: "100%",
    aspectRatio: "16 / 9",
    display: "block",
    objectFit: "cover",
    background: "#080d17",
  };

  const controlStyle = {
    border: "1px solid #39465c",
    borderRadius: 10,
    padding: "11px 16px",
    cursor: "pointer",
    color: "#f8fafc",
    background: "#243247",
    fontSize: 14,
    fontWeight: 600,
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px",
        boxSizing: "border-box",
        background: "#0b1120",
        color: "#f8fafc",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 24,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>
              DSignora AI Connect
            </h1>
            <p style={{ color: "#a9b7ca", marginBottom: 0 }}>
              Accessible video communication
            </p>
          </div>

          <button
            onClick={copyInvite}
            style={controlStyle}
          >
            Copy invite link
          </button>
        </header>

        <div
          style={{
            padding: 16,
            marginBottom: 20,
            borderRadius: 12,
            background: "#162337",
            border: "1px solid #29364b",
          }}
        >
          <strong>Room:</strong> {roomId}
          <p style={{ marginBottom: 0, color: "#b6c5d8" }}>
            <strong>Status:</strong> {status}
          </p>
          {error && (
            <p role="alert" style={{ color: "#fca5a5" }}>
              {error}
            </p>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 18,
          }}
        >
          <section style={panelStyle}>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={videoStyle}
            />
            <div style={{ padding: 14 }}>
              <strong>{displayName} (You)</strong>
              <p style={{ color: "#a9b7ca", marginBottom: 0 }}>
                Your camera
              </p>
            </div>
          </section>

          <section style={panelStyle}>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={videoStyle}
            />
            <div style={{ padding: 14 }}>
              <strong>Other participant</strong>
              <p style={{ color: "#a9b7ca", marginBottom: 0 }}>
                {connected
                  ? "Video and audio connected"
                  : remotePresent
                    ? "Receiving participant stream"
                    : "Waiting for participant"}
              </p>
            </div>
          </section>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 12,
            marginTop: 24,
          }}
        >
          <button
            onClick={toggleMicrophone}
            style={controlStyle}
          >
            {micEnabled ? "Mute microphone" : "Unmute microphone"}
          </button>

          <button
            onClick={toggleCamera}
            style={controlStyle}
          >
            {cameraEnabled ? "Turn camera off" : "Turn camera on"}
          </button>

          <button
            onClick={leaveCall}
            style={{
              ...controlStyle,
              background: "#b42332",
              borderColor: "#b42332",
            }}
          >
            Leave call
          </button>
        </div>

        <p
          style={{
            textAlign: "center",
            color: "#94a3b8",
            marginTop: 24,
            fontSize: 13,
          }}
        >
          Tip: Use two separate browser sessions and allow camera and
          microphone access in both.
        </p>
      </div>
    </main>
  );
}
