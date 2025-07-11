// src/services/api.js

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

const apiRequest = async (endpoint, method = "GET", body = null) => {
  try {
    const headers = {
      "Content-Type": "application/json",
    };

    const config = {
      method,
      headers,
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    let data = {};
    try {
      data = await response.json();
    } catch (jsonError) {
      data = {};
    }

    let errorMsg = null;
    if (!response.ok) {
      errorMsg =
        data.message || data.error || response.statusText || "Unknown error";
    }

    return {
      ok: response.ok,
      error: errorMsg,
      data, // All API response data inside data
    };
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    return {
      ok: false,
      error: error.message || "Network error",
      data: {},
    };
  }
};

export const registerUser = async (username, age, password) => {
  return apiRequest("/users/register", "POST", {
    username,
    age,
    password,
  });
};

export const loginUser = async (username, password) => {
  return apiRequest("/users/login", "POST", { username, password });
};

// Other API methods unchanged (add them as you have)

export const submitScore = async (scoreData) => {
  return apiRequest("/game/scores", "POST", scoreData);
};

export const fetchLeaderboard = async (mode = "all") => {
  return apiRequest(`/game/scores/leaderboard?mode=${mode}`);
};

export const fetchPlayerProgressByUsername = async (username) => {
  return apiRequest(`/game/scores/player/username/${username}`);
};

export const fetchGameSettings = async (mode) => {
  return apiRequest(`/game/settings/${mode}`);
};

export const startGame = async (gameConfig) => {
  return apiRequest("/game/control/start", "POST", gameConfig);
};

export const stopGame = async () => {
  return apiRequest("/game/control/stop", "POST");
};

export const resetGame = async () => {
  return apiRequest("/game/control/reset", "POST");
};

export const sendCommand = async (command, data = {}) => {
  return apiRequest("/game/control/command", "POST", { command, data });
};

export const testConnection = async () => {
  return apiRequest("/game/control/test");
};

export const getConnectionStatus = async () => {
  return apiRequest("/game/control/status");
};
export async function fetchUserScores(userId) {
  try {
    const res = await fetch(`/api/game/scores/user/${userId}`);
    const data = await res.json();
    return { ok: res.ok, data, error: !res.ok ? data?.message || 'Failed to fetch user scores' : null };
  } catch (err) {
    return { ok: false, error: err.message || 'Network error' };
  }
}