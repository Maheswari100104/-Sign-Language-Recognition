
import { useState } from "react";
import { loginUser, registerUser } from "./api";
import "./Login.css";

const ROLES = {
  sign: "sign_language",
  hearing: "hearing",
};

export default function Login({ onLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(ROLES.sign);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (isSignup && !cleanName) {
      setError("Please enter your full name.");
      return;
    }

    if (!cleanEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setIsLoading(true);

    try {
      let result;

      if (isSignup) {
        // The API and backend must accept and save the role.
        await registerUser(
          cleanName,
          cleanEmail,
          password,
          role
        );

        result = await loginUser(cleanEmail, password);
      } else {
        result = await loginUser(cleanEmail, password);
      }

      if (!result?.access_token || !result?.user) {
        throw new Error(
          "The server returned an invalid login response."
        );
      }

      // A login selection must match the authenticated account.
      // Adapt "role" below if your backend uses another field name.
      const userRole = result.user.role;

      if (!userRole) {
        throw new Error(
          "Your account has no saved role. Please contact the administrator."
        );
      }

      if (userRole !== role) {
        throw new Error(
          "The selected role does not match your account. Please select the correct role."
        );
      }

      const storage = remember ? localStorage : sessionStorage;
      const otherStorage = remember
        ? sessionStorage
        : localStorage;

      storage.setItem(
        "dsignora_access_token",
        result.access_token
      );

      storage.setItem(
        "dsignora_user",
        JSON.stringify(result.user)
      );

      otherStorage.removeItem("dsignora_access_token");
      otherStorage.removeItem("dsignora_user");

      onLogin?.(result.user);
    } catch (err) {
      setError(
        err.message || "Unable to connect. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function toggleSignup() {
    setIsSignup((previous) => !previous);
    setError("");
    setPassword("");
    setShowPassword(false);
  }

  return (
    <main className="login-page">
      <div
        className="background-shape shape-one"
        aria-hidden="true"
      />
      <div
        className="background-shape shape-two"
        aria-hidden="true"
      />
      <div
        className="background-shape shape-three"
        aria-hidden="true"
      />
      <div
        className="background-shape shape-four"
        aria-hidden="true"
      />

      <section className="login-form-section">
        <div className="login-card">
          <div className="login-brand">
            <div className="login-brand-icon">S</div>
            <h1>Signora AI</h1>
            <p className="brand-tagline">
              ACCESSIBLE COMMUNICATION
            </p>
          </div>

          <div className="welcome-section">
            <div className="welcome-icon" aria-hidden="true">
              ✦
            </div>

            <h2>
              {isSignup
                ? "Create your account"
                : "Welcome back"}
            </h2>

            <p className="form-description">
              {isSignup
                ? "Join Signora AI and choose your communication mode."
                : "Sign in to continue your communication journey."}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {isSignup && (
              <div className="form-field">
                <label htmlFor="full-name">Full name</label>
                <input
                  id="full-name"
                  type="text"
                  placeholder="Enter your full name"
                  autoComplete="name"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  minLength={2}
                  maxLength={120}
                  required
                  disabled={isLoading}
                />
              </div>
            )}

            <div className="form-field">
              <label htmlFor="email">Email address</label>

              <div className="input-with-icon">
                <span className="field-icon" aria-hidden="true">
                  ✉
                </span>

                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  maxLength={255}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="password">Password</label>

              <div className="password-wrapper">
                <span className="field-icon" aria-hidden="true">
                  ♙
                </span>

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete={
                    isSignup
                      ? "new-password"
                      : "current-password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  minLength={8}
                  maxLength={128}
                  required
                  disabled={isLoading}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  disabled={isLoading}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Role selection */}
            <div className="form-field role-field">
              <label>Choose your role</label>

              <div className="role-options">
                <button
                  type="button"
                  className={`role-option ${
                    role === ROLES.sign ? "selected" : ""
                  }`}
                  aria-pressed={role === ROLES.sign}
                  onClick={() => setRole(ROLES.sign)}
                  disabled={isLoading}
                >
                  <span className="role-icon" aria-hidden="true">
                    🤟
                  </span>

                  <span className="role-text">
                    <strong>Sign Language User</strong>
                    <small>
                      Sign recognition and visual communication
                    </small>
                  </span>

                  <span className="role-check" aria-hidden="true">
                    {role === ROLES.sign ? "✓" : ""}
                  </span>
                </button>

                <button
                  type="button"
                  className={`role-option ${
                    role === ROLES.hearing ? "selected" : ""
                  }`}
                  aria-pressed={role === ROLES.hearing}
                  onClick={() => setRole(ROLES.hearing)}
                  disabled={isLoading}
                >
                  <span className="role-icon" aria-hidden="true">
                    🎙️
                  </span>

                  <span className="role-text">
                    <strong>Hearing / General User</strong>
                    <small>
                      Voice, speech-to-text and text-to-speech
                    </small>
                  </span>

                  <span className="role-check" aria-hidden="true">
                    {role === ROLES.hearing ? "✓" : ""}
                  </span>
                </button>
              </div>
            </div>

            {!isSignup && (
              <div className="form-options">
                <label className="remember-option">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) =>
                      setRemember(event.target.checked)
                    }
                    disabled={isLoading}
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  className="forgot-password"
                  onClick={() =>
                    setError(
                      "Password recovery is not configured yet. Please contact your administrator."
                    )
                  }
                  disabled={isLoading}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="login-submit"
              disabled={isLoading}
            >
              <span>
                {isLoading
                  ? "Please wait..."
                  : isSignup
                    ? "Create account"
                    : "Sign In"}
              </span>

              {!isLoading && (
                <span className="submit-arrow" aria-hidden="true">
                  →
                </span>
              )}
            </button>
          </form>

          <div className="form-divider">
            <span />
            <p>OR</p>
            <span />
          </div>

          <p className="signup-prompt">
            {isSignup
              ? "Already have an account?"
              : "New to Signora AI?"}

            <button
              type="button"
              onClick={toggleSignup}
              disabled={isLoading}
            >
              {isSignup ? "Sign in" : "Create account"}
            </button>
          </p>

          <div className="security-note">
            <span aria-hidden="true">✧</span>
            <p>
              Your communication matters. Accessibility comes first.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
