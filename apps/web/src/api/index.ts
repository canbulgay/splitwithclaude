// Create a new client for API endpoints using axios, with error handling and authentication interceptors
import axios from "axios";

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:3001/api/v1";

// Ensure the API_BASE_URL is defined
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000, // Set a timeout for requests
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add authentication token
apiClient.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem("auth_token") || null;
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        // If no token is present, redirect to login
        const currentPath = window.location.pathname;

        // Redirect to login with return URL (optional)
        window.location.href = `/login?redirect=${encodeURIComponent(
          currentPath
        )}`;
      }
      const status = error.response.status;

      if (status === 401 || status === 403) {
        localStorage.removeItem("auth_token");

        // Optional: capture current page to redirect back after login
        const currentPath = window.location.pathname;

        // Redirect to login with return URL (optional)
        window.location.href = `/login?redirect=${encodeURIComponent(
          currentPath
        )}`;
      }

      const errorMessage = error.response.data?.error || "An error occurred";
      return Promise.reject(new Error(errorMessage));
    } else if (error.request) {
      return Promise.reject(new Error("No response from server"));
    } else {
      return Promise.reject(new Error(error.message));
    }
  }
);
export default apiClient;
