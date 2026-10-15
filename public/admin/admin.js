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

const exportButtonFull = document.getElementById("export-questions-btn");
async function exportAllQuestions() {
  const res = await apiFetch(`/api/admin/export-all-questions`);
  if (!res.ok) {
    throw new Error(`Export failed: ${res.status}`);
  }
  const blob = await res.blob();
  let filename = `all-questions.txt`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
exportButtonFull.addEventListener("click", () => {
  exportAllQuestions();
});

async function exportQuestionBank(bankId) {
  const res = await apiFetch(`/api/admin/export-question-bank/${bankId}`);
  if (!res.ok) {
    throw new Error(`Export failed: ${res.status}`);
  }
  const blob = await res.blob();
  const contentDisposition = res.headers.get("Content-Disposition");
  let filename = `question-bank-${bankId}.txt`;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="([^"]+)"/);
    if (match) {
      const name = match[1].replace(/\.txt$/i, "");
      filename = `question_bank_${name
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .replace(/\s+/g, "_")
        .toLowerCase()}.txt`;
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// --- Bulk import ---
const importDialog = document.getElementById("import-dialog");
const importForm = document.getElementById("import-form");
const importFormError = document.getElementById("import-form-error");
const importFormDetails = document.getElementById("import-form-details");
const importQuestionBank = document.getElementById("import-question-bank");
const importFile = document.getElementById("import-file");

document
  .getElementById("import-questions-btn")
  .addEventListener("click", () => {
    importForm.reset();
    importFormError.textContent = "";
    importFormDetails.innerHTML = "";
    importQuestionBank.innerHTML =
      '<option value="">Unbanked</option>' +
      getQuestionBanks()
        .map((bank) => `<option value="${bank._id}">${bank.name}</option>`)
        .join("");
    importDialog.showModal();
  });

importFile.addEventListener("change", async () => {
  const file = importFile.files[0];
  if (!file) return;

  try {
    document.getElementById("import-text").value = await file.text();
  } catch (err) {
    importFormError.textContent = `Failed to read file: ${err.message}`;
  } finally {
    importFile.value = "";
  }
});

document.getElementById("import-cancel-btn").addEventListener("click", () => {
  importDialog.close();
});

importForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  importFormError.textContent = "";
  importFormDetails.innerHTML = "";

  const payload = {
    text: document.getElementById("import-text").value,
    questionBank: importQuestionBank.value || null,
  };

  try {
    const res = await apiFetch("/api/admin/questions/import", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      importFormError.textContent = data.error || "Import failed";
      importFormDetails.innerHTML = (data.details || [])
        .map((d) => `<li>${d}</li>`)
        .join("");
      return;
    }

    importDialog.close();
    loadQuestions();
    if (data.createdQuestionBanks?.length) {
      alert(
        `Created new question bank(s): ${data.createdQuestionBanks.join(", ")}`,
      );
    }
  } catch (err) {
    importFormError.textContent = err.message;
  }
});



// --- Init ---
initUsers();
initDeployments({
  renderDeploymentQuestionBanks,
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
