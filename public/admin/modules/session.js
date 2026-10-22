import { clearSession } from "./api.js";
let sessionTimeout = null;
let sessionTimer = null;
function logoutAdmin() {
  clearSession();
  window.dispatchEvent(new Event("admin-session-expired"));
}
export function resetAdminTimeout() {
  if (!sessionTimeout) {
    return;
  }
  if (sessionTimer) {
    clearTimeout(sessionTimer);
  }
  sessionTimer = setTimeout(logoutAdmin, sessionTimeout);
}
export async function initAdminSession() {
  const response = await fetch("/api/auth/session-config");
  if (!response.ok) {
    throw new Error("Failed to load session configuration");
  }
  const config = await response.json();
  sessionTimeout = config.sessionTimeoutMs;
  window.addEventListener("admin-session-expired", () => {
    if (sessionTimer) {
      clearTimeout(sessionTimer);
      sessionTimer = null;
    }
  });
  resetAdminTimeout();
}