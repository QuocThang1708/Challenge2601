// API Configuration for Backend
const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000/api"
    : "https://hrm-ai-backend.onrender.com/api"; // Updated for Render

// API Helper function with better error handling
async function apiCall(endpoint, options = {}) {
  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  // Add auth token if exists
  const token = localStorage.getItem("authToken");
  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (multipart)
  const headers = { ...defaultHeaders, ...options.headers };
  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const contentType = response.headers.get("content-type");

    // Handle CSV/file downloads
    if (contentType && contentType.includes("text/csv")) {
      return await response.blob();
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `API Error: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error("API Call Error:", error);

    // Handle 401 Unauthorized - redirect to login
    if (
      error.message.includes("401") ||
      error.message.includes("Unauthorized")
    ) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("isLoggedIn");

      if (
        window.location.pathname !== "/index.html" &&
        window.location.pathname !== "/"
      ) {
        window.location.href = "index.html";
      }
    }

    throw error;
  }
}

// Check authentication
function requireAuth() {
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  const token = localStorage.getItem("authToken");

  if (!isLoggedIn || !token) {
    window.location.href = "index.html";
    return false;
  }
  return true;
}

// Get current user
function getCurrentUser() {
  const userStr = localStorage.getItem("currentUser");
  return userStr ? JSON.parse(userStr) : null;
}

// Logout
function logout() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("isLoggedIn");
  window.location.href = "index.html";
}

// Export for use in other files
window.API_BASE_URL = API_BASE_URL;
window.apiCall = apiCall;
window.requireAuth = requireAuth;
window.getCurrentUser = getCurrentUser;
window.logout = logout;
