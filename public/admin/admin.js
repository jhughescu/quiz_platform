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

// --- Templates ---

async function loadTemplates() {
  const response = await apiFetch("/api/admin/templates");
  if (!response.ok) {
    throw new Error("Failed to load templates");
  }
  const templates = await response.json();
  const templateSelect = document.getElementById("deployment-template");
  const versionSelect = document.getElementById("deployment-template-version");
  templateSelect.innerHTML = '<option value="">Select a template</option>';
  versionSelect.innerHTML = '<option value="">Select a version</option>';
  templates.forEach((template) => {
    const option = document.createElement("option");
    option.value = template.id;
    option.textContent = template.name;
    option.dataset.version = template.version;
    templateSelect.appendChild(option);
  });
}
async function loadPresentations() {
  const response = await apiFetch("/api/admin/presentations");
  if (!response.ok) {
    throw new Error("Failed to load presentations");
  }
  const presentations = await response.json();
  const select = document.getElementById("deployment-presentation");
  select.innerHTML = '<option value="">Select a presentation</option>';
  presentations.forEach((presentation) => {
    const option = document.createElement("option");
    option.value = presentation.id;
    option.textContent = presentation.name;
    select.appendChild(option);
  });
}

// --- Question banks ---
// note: moving to modules/question-banks.js

async function loadDeployments() {
  const container = document.getElementById("deployments-container");
  if (!container) {
    return;
  }
  container.textContent = "Loading deployments...";
  try {
    const response = await apiFetch("/api/admin/deployments");
    const deployments = await response.json();
    if (!deployments.length) {
      container.textContent = "No deployments found.";
      return;
    }
    container.innerHTML = "";
    for (const deployment of deployments) {
      const html = await renderTemplate(
        "/admin/templates/deployment-item.hbs",
        {
          ...deployment,
          created: new Date(deployment.createdAt).toLocaleString(),
          url: `${window.location.origin}/quiz/?id=${deployment._id}`,
        },
      );
      const item = document.createRange().createContextualFragment(html);
      item
        .querySelector(".deployment-view-btn")
        .addEventListener("click", async () => {
          viewDeployment(deployment._id);
        });
      container.appendChild(item);
    }
  } catch (err) {
    console.error("Failed to load deployments:", err);
    container.textContent = "Failed to load deployments.";
  }
}
document
  .getElementById("new-deployment-btn")
  .addEventListener("click", async () => {
    renderDeploymentQuestionBanks();
    await loadTemplates();
    await loadPresentations();
    document.getElementById("deployment-dialog").showModal();
  });
document
  .getElementById("deployment-template")
  .addEventListener("change", () => {
    const templateSelect = document.getElementById("deployment-template");
    const versionSelect = document.getElementById(
      "deployment-template-version",
    );
    versionSelect.innerHTML = '<option value="">Select a version</option>';
    const selectedOption = templateSelect.selectedOptions[0];
    if (!selectedOption || !selectedOption.dataset.version) {
      return;
    }
    const option = document.createElement("option");
    option.value = selectedOption.dataset.version;
    option.textContent = selectedOption.dataset.version;
    versionSelect.appendChild(option);
    versionSelect.value = selectedOption.dataset.version;
  });
document
  .getElementById("deployment-presentation")
  .addEventListener("change", () => {
    const presentationSelect = document.getElementById(
      "deployment-presentation",
    );
    versionSelect.innerHTML = '<option value="">Select a version</option>';
    const selectedOption = presentationSelect.selectedOptions[0];
    if (!selectedOption || !selectedOption.dataset.version) {
      return;
    }
    const option = document.createElement("option");
    option.value = selectedOption.dataset.version;
    option.textContent = selectedOption.dataset.version;
    versionSelect.appendChild(option);
    versionSelect.value = selectedOption.dataset.version;
  });
document
  .getElementById("deployment-cancel-btn")
  .addEventListener("click", () => {
    document.getElementById("deployment-dialog").close();
  });
document
  .getElementById("deployment-form")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("deployment-name").value.trim();
    const questionBankId = document.getElementById(
      "deployment-question-bank",
    ).value;
    const templateId = document
      .getElementById("deployment-template")
      .value.trim();
    const templateVersion = document
      .getElementById("deployment-template-version")
      .value.trim();
    const presentationId = document
      .getElementById("deployment-presentation")
      .value.trim();
    const errorElement = document.getElementById("deployment-form-error");

    const randomiseOptions = document.getElementById(
      "deployment-randomise-options",
    ).checked;
    const randomiseQuestions = document.getElementById(
      "deployment-randomise-questions",
    ).checked;

    errorElement.textContent = "";

    try {
      const response = await apiFetch("/api/admin/deployments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          questionBankId,
          template: {
            id: templateId,
            version: templateVersion,
          },
          presentation: {
            id: presentationId,
            version: "1.0", // Default version for now, can be updated later if needed
          },
          randomiseOptions,
          randomiseQuestions,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to create deployment");
      }

      document.getElementById("deployment-dialog").close();
      document.getElementById("deployment-form").reset();

      loadDeployments();
    } catch (err) {
      console.error("Failed to create deployment:", err);

      errorElement.textContent = err.message;
    }
  });
document
  .getElementById("deployment-details-close-btn")
  .addEventListener("click", () => {
    document.getElementById("deployment-details-dialog").close();
  });
async function viewDeployment(deploymentId) {
  const dialog = document.getElementById("deployment-details-dialog");
  const nameElement = document.getElementById("deployment-details-name");
  const contentElement = document.getElementById("deployment-details-content");
  nameElement.textContent = "";
  dialog.showModal();
  try {
    contentElement.innerHTML = await renderTemplate(
      "/admin/templates/deployment-loading.hbs",
    );
    const response = await apiFetch(`/api/admin/deployments/${deploymentId}`);
    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || "Failed to load deployment");
    }
    const deployment = await response.json();
    nameElement.textContent = deployment.name;
    contentElement.innerHTML = await renderTemplate(
      "/admin/templates/deployment-details.hbs",
      {
        ...deployment,
        created: new Date(deployment.createdAt).toLocaleString(),
      },
    );
  } catch (err) {
    console.error("Failed to load deployment details:", err);
    contentElement.innerHTML = await renderTemplate(
      "/admin/templates/deployment-error.hbs",
    );
  }
}

// --- Submissions ---
const submissionsTableBody = document.getElementById("submissions-table-body");

async function loadSubmissions() {
  const res = await apiFetch("/api/admin/submissions");
  const submissions = await res.json();
  submissionsTableBody.innerHTML = submissions
    .map(
      (s) =>
        `<tr><td>${new Date(s.submittedAt).toLocaleString()}</td><td>${s.score} / ${s.total}</td></tr>`,
    )
    .join("");
}

// --- Users (superuser only) ---
const usersTableContainer = document.getElementById("users-table-container");
const userDialog = document.getElementById("user-dialog");
const userForm = document.getElementById("user-form");
const userFormError = document.getElementById("user-form-error");

document.getElementById("new-user-btn").addEventListener("click", () => {
  userForm.reset();
  userFormError.textContent = "";
  userDialog.showModal();
});

document.getElementById("user-cancel-btn").addEventListener("click", () => {
  userDialog.close();
});

async function loadUsers() {
  const res = await apiFetch("/api/admin/users");
  const users = await res.json();

  const currentUser = JSON.parse(
    localStorage.getItem("quizAdminUser") || "null",
  );

  const userData = users.map((user) => ({
    ...user,
    isCurrentUser: user._id === currentUser?.id,
  }));

  const html = await renderTemplate("/admin/templates/users-table.hbs", {
    users: userData,
  });

  usersTableContainer.innerHTML = html;

  usersTableContainer.querySelectorAll(".delete-user-btn").forEach((button) => {
    const id = button.closest("tr").dataset.id;

    button.addEventListener("click", () => {
      deleteUser(id);
    });
  });
}

userForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  userFormError.textContent = "";

  const payload = {
    email: document.getElementById("u-email").value,
    password: document.getElementById("u-password").value,
    role: document.getElementById("u-role").value,
  };

  try {
    const res = await apiFetch("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.details
          ? data.details.join("; ")
          : data.error || "Failed to create user",
      );
    }

    userDialog.close();
    loadUsers();
  } catch (err) {
    userFormError.textContent = err.message;
  }
});

async function deleteUser(id) {
  if (!confirm("Delete this user?")) return;
  await apiFetch(`/api/admin/users/${id}`, { method: "DELETE" });
  loadUsers();
}

// --- Init ---
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
