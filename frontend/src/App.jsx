
import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";

import "./index.css";
import Home from "./Home.jsx";
import Login from "./Login.jsx";
import Dashboard from "./Dashboard.jsx";
import HearingDashboard from "./HearingDashboard.jsx";
import VideoCall from "./VideoCall.jsx";

// Decide which dashboard belongs to each role.
function getDashboardPath(user) {
  if (user?.role === "sign_language") {
    return "/dashboard";
  }

  if (user?.role === "hearing") {
    return "/hearing-dashboard";
  }

  return "/login";
}

// Video call room entry screen.
function CallLobby({ user }) {
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();

  function joinRoom(event) {
    event.preventDefault();

    const room = roomId.trim();

    if (!room) return;

    navigate(`/call/${encodeURIComponent(room)}`);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        boxSizing: "border-box",
        background: "#0b1120",
        color: "#f8fafc",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <form
        onSubmit={joinRoom}
        style={{
          width: "100%",
          maxWidth: 430,
          boxSizing: "border-box",
          padding: 28,
          background: "#101827",
          border: "1px solid #29364b",
          borderRadius: 18,
        }}
      >
        <h1 style={{ marginTop: 0 }}>DSignora AI Connect</h1>

        <p style={{ color: "#b6c5d8", lineHeight: 1.6 }}>
          Enter a room ID to start an accessible video call.
          Share the same room ID with the other participant.
        </p>

        <label
          htmlFor="roomId"
          style={{ display: "block", marginBottom: 8 }}
        >
          Room ID
        </label>

        <input
          id="roomId"
          value={roomId}
          onChange={(event) => setRoomId(event.target.value)}
          placeholder="Example: signora-demo"
          maxLength={80}
          required
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: 13,
            borderRadius: 9,
            border: "1px solid #39465c",
            background: "#0b1120",
            color: "#ffffff",
            marginBottom: 16,
          }}
        />

        <button
          type="submit"
          style={{
            width: "100%",
            padding: 13,
            border: 0,
            borderRadius: 9,
            background: "#4f46e5",
            color: "white",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Join video call
        </button>

        <button
          type="button"
          onClick={() => navigate(getDashboardPath(user))}
          style={{
            width: "100%",
            padding: 12,
            marginTop: 10,
            border: "1px solid #39465c",
            borderRadius: 9,
            background: "transparent",
            color: "white",
            cursor: "pointer",
          }}
        >
          Back to dashboard
        </button>
      </form>
    </main>
  );
}

function AppRoutes() {
  const navigate = useNavigate();

  function getSavedUser() {
    try {
      const savedUser =
        localStorage.getItem("dsignora_user") ||
        sessionStorage.getItem("dsignora_user");

      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  }

  function hasSavedSession() {
    const token =
      localStorage.getItem("dsignora_access_token") ||
      sessionStorage.getItem("dsignora_access_token");

    return Boolean(token && getSavedUser());
  }

  const [user, setUser] = useState(getSavedUser);
  const [isAuthenticated, setIsAuthenticated] =
    useState(hasSavedSession);

  function handleLogin(authenticatedUser) {
    if (
      !authenticatedUser ||
      !["sign_language", "hearing"].includes(
        authenticatedUser.role
      )
    ) {
      console.error(
        "Login did not return a valid DSignora user role.",
        authenticatedUser
      );
      return;
    }

    setUser(authenticatedUser);
    setIsAuthenticated(true);

    navigate(getDashboardPath(authenticatedUser), {
      replace: true,
    });
  }

  function handleLogout() {
    localStorage.removeItem("dsignora_access_token");
    localStorage.removeItem("dsignora_user");
    sessionStorage.removeItem("dsignora_access_token");
    sessionStorage.removeItem("dsignora_user");

    setUser(null);
    setIsAuthenticated(false);

    navigate("/", { replace: true });
  }

  function protectedPage(element, allowedRole) {
    if (!isAuthenticated || !user) {
      return <Navigate to="/login" replace />;
    }

    if (allowedRole && user.role !== allowedRole) {
      return (
        <Navigate
          to={getDashboardPath(user)}
          replace
        />
      );
    }

    return element;
  }

  return (
    <Routes>
      {/* Home */}
      <Route
        path="/"
        element={
          <Home onGetStarted={() => navigate("/login")} />
        }
      />

      {/* Login */}
      <Route
        path="/login"
        element={
          isAuthenticated && user ? (
            <Navigate
              to={getDashboardPath(user)}
              replace
            />
          ) : (
            <Login
              onLogin={handleLogin}
              onBack={() => navigate("/")}
            />
          )
        }
      />

      {/* Sign Language User dashboard */}
      <Route
        path="/dashboard"
        element={protectedPage(
          <Dashboard
            user={user}
            onLogout={handleLogout}
          />,
          "sign_language"
        )}
      />

      {/* Hearing User dashboard */}
      <Route
        path="/hearing-dashboard"
        element={protectedPage(
          <HearingDashboard
            user={user}
            onLogout={handleLogout}
          />,
          "hearing"
        )}
      />

      {/* Video call lobby: both roles can join */}
      <Route
        path="/call"
        element={protectedPage(
          <CallLobby user={user} />
        )}
      />

      {/* Shared video call room */}
      <Route
        path="/call/:roomId"
        element={protectedPage(
          <VideoCallRoute user={user} />
        )}
      />

      {/* Unknown routes */}
      <Route
        path="*"
        element={
          <Navigate
            to={
              isAuthenticated && user
                ? getDashboardPath(user)
                : "/"
            }
            replace
          />
        }
      />
    </Routes>
  );
}

function VideoCallRoute({ user }) {
  const { roomId } = useParams();

  return <VideoCall key={roomId} user={user} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
