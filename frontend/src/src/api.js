
const API_BASE_URL = "http://127.0.0.1:8000";

/**
 * Send a request to the FastAPI backend.
 */
async function apiRequest(endpoint, payload) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      "Cannot connect to the DSignora AI backend. Please make sure FastAPI is running on port 8000."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail ||
        `Request failed with status ${response.status}.`
    );
  }

  return data;
}

/**
 * Register a new user.
 * The backend expects full_name, email, and password.
 */
export async function registerUser(name, email, password) {
  return apiRequest("/auth/register", {
    full_name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
  });
}

/**
 * Authenticate an existing user.
 */
export async function loginUser(email, password) {
  return apiRequest("/auth/login", {
    email: email.trim().toLowerCase(),
    password,
  });
}
