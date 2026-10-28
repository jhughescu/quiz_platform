import { getToken, setSession, clearSession, apiFetch } from "./modules/api.js";
import {
  initQuestionBanks,
  getQuestionBanks,
  loadQuestionBanks,
  renderDeploymentQuestionBanks,
} from "./modules/question-banks.js";
import {
  initNewQuestionButton,
  initQuestionCancelButton,
  initQuestionTypeListener,
  initQuestionForm,
} from "./modules/questions.js";
import { renderQuestionGroups } from "./modules/question-groups.js";
import { loadSubmissions } from "./modules/submissions.js";
import { initUsers, loadUsers } from "./modules/users.js";
import { loadDeployments, initDeployments } from "./modules/deployments.js";
import {
  exportQuestionBank,
  initExportAllQuestions,
  initImport,
} from "./modules/import-export.js";
import { initAdminSession, resetAdminTimeout } from "./modules/session.js";

const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard-view");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const currentUserEl = document.getElementById("current-user");
const logoutBtn = document.getElementById("logout-btn");
const DASHBOARD_VIEW_KEY = "quizAdminDashboardView";

const originalSetItem = localStorage.setItem;
localStorage.setItem = function (key, value) {
  return originalSetItem.call(this, key, value);
};

function showLogin() {
  document.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
  loginView.hidden = false;
  dashboardView.hidden = true;
}

function showDashboard() {
  loginView.hidden = true;
  dashboardView.hidden = false;
  const user = JSON.parse(localStorage.getItem("quizAdminUser") || "null");
  currentUserEl.textContent = user
    ? `Logged in as ${user.email} (${user.role})`
    : "";
  document.getElementById("users-tab-btn").hidden =
    !user || user.role !== "superuser";
  // Reset to the Questions tab so a previously active tab from a different session doesn't leak through
  const savedView = sessionStorage.getItem(DASHBOARD_VIEW_KEY);
  const view = document.querySelector(`.tab-btn[data-tab="${savedView}"]`)
    ? savedView
    : "questions";
  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach((p) => (p.hidden = true));
  document
    .querySelector(`.tab-btn[data-tab="${view}"]`)
    .classList.add("active");
  document.getElementById(`${view}-tab`).hidden = false;
  if (view === "deployments") {
    loadDeployments();
  }
  loadQuestions();
  loadSubmissions();
  if (user && user.role === "superuser") loadUsers();
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  initAdminSession();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Login failed");
    }

    const data = await res.json();
    setSession(data.token, data.user);
    showDashboard();
  } catch (err) {
    loginError.textContent = err.message;
  }
});

logoutBtn.addEventListener("click", () => {
  clearSession();
  showLogin();
});

// --- Tabs ---
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    resetAdminTimeout();
    document
      .querySelectorAll(".tab-btn")
      .forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => (p.hidden = true));
    btn.classList.add("active");
    sessionStorage.setItem(DASHBOARD_VIEW_KEY, btn.dataset.tab);
    document.getElementById(`${btn.dataset.tab}-tab`).hidden = false;
    if (btn.dataset.tab === "questions") {
      loadQuestions(true);
    }
    if (btn.dataset.tab === "deployments") {
      loadDeployments(true);
    }
    if (btn.dataset.tab === "submissions") {
      loadSubmissions(true);
    }
    if (btn.dataset.tab === "users") {
      loadUsers(true);
    }
  });
});

// --- Questions ---
const questionGroups = document.getElementById("question-groups");

async function loadQuestions(userActivity = false) {
  const response = await apiFetch("/api/admin/questions", {}, userActivity);
  const questions = await response.json();
  await loadQuestionBanks();
  await renderQuestionGroups(questions, {
    questionGroups,
    loadQuestions,
    exportQuestionBank,
    showOwner: isSuperuser(),
  });
}

function isSuperuser() {
  const user = JSON.parse(localStorage.getItem("quizAdminUser") || "null");
  return user?.role === "superuser";
}
// --- Init ---
initUsers();
window.addEventListener("admin-session-expired", showLogin);
initAdminSession();
initDeployments({
  renderDeploymentQuestionBanks,
});
initExportAllQuestions();
initImport({
  loadQuestions,
  getQuestionBanks,
});
initQuestionBanks({ loadQuestions });
initNewQuestionButton();
initQuestionCancelButton();
initQuestionTypeListener();
initQuestionForm({ apiFetch, loadQuestions });
if (getToken()) {
  showDashboard();
} else {
  showLogin();
}
