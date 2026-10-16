import { getToken, setSession, clearSession, apiFetch } from "./modules/api.js";
import { renderTemplate } from "../js/template.js";
import {
  initQuestionBanks,
  deleteQuestionBank,
  getQuestionBanks,
  loadQuestionBanks,
  openQuestionBankDialog,
  renderDeploymentQuestionBanks,
} from "./modules/question-banks.js";
import {
  deleteQuestion,
  openEditDialog,
  initNewQuestionButton,
  initQuestionCancelButton,
  initQuestionTypeListener,
  initQuestionForm,
} from "./modules/questions.js";
import { renderQuestionGroups } from "./modules/question-groups.js";
import { loadSubmissions } from "./modules/submissions.js";
import { initUsers, loadUsers } from "./modules/users.js";
import {
  loadDeployments,
  initDeployments,
} from "./modules/deployments.js";
import {
  exportQuestionBank,
  initExportAllQuestions,
  initImport,
} from "./modules/import-export.js";

const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard-view");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const currentUserEl = document.getElementById("current-user");
const logoutBtn = document.getElementById("logout-btn");

function showLogin() {
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
  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  document
    .querySelector('.tab-btn[data-tab="questions"]')
    .classList.add("active");
  document.querySelectorAll(".tab-panel").forEach((p) => (p.hidden = true));
  document.getElementById("questions-tab").hidden = false;
  loadQuestions();
  loadSubmissions();
  if (user && user.role === "superuser") loadUsers();
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";

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
    document
      .querySelectorAll(".tab-btn")
      .forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => (p.hidden = true));
    btn.classList.add("active");
    document.getElementById(`${btn.dataset.tab}-tab`).hidden = false;
    if (btn.dataset.tab === "deployments") {
      loadDeployments();
    }
  });
});

// --- Questions ---
const questionGroups = document.getElementById("question-groups");

async function loadQuestions() {
  const response = await apiFetch("/api/admin/questions");
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


// --- Bulk import ---



// --- Init ---
initUsers();
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
window.addEventListener("admin-session-expired", showLogin);
if (getToken()) {
  showDashboard();
} else {
  showLogin();
}
