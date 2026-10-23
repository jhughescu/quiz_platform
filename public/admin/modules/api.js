const TOKEN_KEY = "quizAdminToken";
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem("quizAdminUser", JSON.stringify(user));
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("quizAdminUser");
}
export async function apiFetch(path, options = {}, userActivity = false) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (userActivity) {
    headers["X-User-Activity"] = "true";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(path, {
    ...options,
    headers,
  });
  if (response.status === 401) {
    clearSession();
    window.dispatchEvent(new Event("admin-session-expired"));
    throw new Error("Session expired, please log in again");
  }
  const renewedToken = response.headers.get("X-Renewed-Token");
  if (renewedToken) {
    localStorage.setItem(TOKEN_KEY, renewedToken);
  }
  return response;
}
