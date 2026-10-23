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
  console.log("apiFetch activity:", path, userActivity);
  const token = getToken();
  console.log("apiFetch:", path, "token:", token, "time:", Date.now());
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
    console.log("Token renewed by:", path);
    console.log("Renewed token length:", renewedToken.length);
    console.log("Response URL:", response.url);
    console.log("Response status:", response.status);
    console.log("All response headers:");
    for (const [name, value] of response.headers.entries()) {
      console.log(name, value);
    }
    localStorage.setItem(TOKEN_KEY, renewedToken);
  }
  return response;
}
