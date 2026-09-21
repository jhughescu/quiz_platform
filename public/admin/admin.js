const TOKEN_KEY = "quizAdminToken";

const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard-view");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const currentUserEl = document.getElementById("current-user");
const logoutBtn = document.getElementById("logout-btn");

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem("quizAdminUser", JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("quizAdminUser");
}

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...options.headers,
    },
  });

  if (res.status === 401) {
    clearSession();
    showLogin();
    throw new Error("Session expired, please log in again");
  }

  return res;
}

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
  });
});

// --- Questions ---
const questionDialog = document.getElementById("question-dialog");
const questionForm = document.getElementById("question-form");
const questionFormTitle = document.getElementById("question-form-title");
const questionFormError = document.getElementById("question-form-error");
const qType = document.getElementById("q-type");
const qQuestionBank = document.getElementById("q-question-bank");
const questionGroups = document.getElementById("question-groups");

let editingQuestionId = null;
let questionBanks = [];

function updateTypeFields() {
  const type = qType.value;
  document
    .getElementById("q-options-field")
    .classList.toggle(
      "active",
      type === "multiple-choice" || type === "multi-select",
    );
  document
    .getElementById("q-true-false-field")
    .classList.toggle("active", type === "true-false");
  document
    .getElementById("q-short-answer-field")
    .classList.toggle("active", type === "short-answer");
}

qType.addEventListener("change", updateTypeFields);

document.getElementById("new-question-btn").addEventListener("click", () => {
  editingQuestionId = null;
  questionFormTitle.textContent = "New Question";
  questionForm.reset();
  updateTypeFields();
  questionFormError.textContent = "";
  questionDialog.showModal();
});

document.getElementById("question-cancel-btn").addEventListener("click", () => {
  questionDialog.close();
});

async function loadQuestions() {
  const [questionsRes, questionBanksRes] = await Promise.all([
    apiFetch("/api/admin/questions"),
    apiFetch("/api/admin/question-banks"),
  ]);
  const questions = await questionsRes.json();
  questionBanks = await questionBanksRes.json();
  renderQuestionBankOptions();
  renderQuestionGroups(questions);
}

function renderQuestionBankOptions() {
  qQuestionBank.innerHTML =
    '<option value="">Unbanked</option>' +
    questionBanks
      .map((bank) => `<option value="${bank._id}">${bank.name}</option>`)
      .join("");
}

function isSuperuser() {
  const user = JSON.parse(localStorage.getItem("quizAdminUser") || "null");
  return user?.role === "superuser";
}

function renderQuestionsTable(questions) {
  const showOwner = isSuperuser();
  return `
    <table>
      <thead><tr><th>Type</th><th>Question</th>${showOwner ? "<th>Owner</th>" : ""}<th>Actions</th></tr></thead>
      <tbody>
  ${questions
    .map(
      (q) => `
    <tr data-id="${q._id}">
      <td>${q.type}</td>
      <td>${q.question}</td>
      ${showOwner ? `<td>${q.createdBy?.email || "Unknown"}</td>` : ""}
      <td>
        <button type="button" class="edit-btn">Edit</button>
        <button type="button" class="delete-btn">Delete</button>
      </td>
    </tr>`,
    )
    .join("")}
      </tbody>
    </table>`;
}

function renderQuestionGroups(questions) {
  const unbankedQuestions = questions.filter(
    (question) => !question.questionBank,
  );
  const groups = [
    { name: "Unbanked Questions", questions: unbankedQuestions, bank: null },
    ...questionBanks.map((bank) => ({
      name: bank.name,
      questions: questions.filter(
        (question) => question.questionBank === bank._id,
      ),
      bank,
    })),
  ];

  questionGroups.innerHTML = groups
    .map(
      ({ name, questions: groupQuestions, bank }) => `
      <section class="question-group">
        <div class="question-group-header">
          <h3>${name}${bank && isSuperuser() ? ` (${bank.createdBy?.email || "Unknown"})` : ""}</h3>
          ${bank ? `<div><button type="button" class="export-bank-btn" data-id="${bank._id}">Export</button> <button type="button" class="edit-bank-btn" data-id="${bank._id}">Edit</button> <button type="button" class="delete-bank-btn" data-id="${bank._id}">Delete</button></div>` : ""}
        </div>
        ${renderQuestionsTable(groupQuestions)}
      </section>`,
    )
    .join("");

  questionGroups.querySelectorAll("tr[data-id]").forEach((row) => {
    const id = row.dataset.id;
    const question = questions.find((q) => q._id === id);
    row
      .querySelector(".edit-btn")
      .addEventListener("click", () => openEditDialog(question));
    row
      .querySelector(".delete-btn")
      .addEventListener("click", () => deleteQuestion(id));
  });

  questionGroups.querySelectorAll(".export-bank-btn").forEach((button) => {
    button.addEventListener("click", () =>
      exportQuestionBank(button.dataset.id),
    );
  });
  questionGroups.querySelectorAll(".edit-bank-btn").forEach((button) => {
    button.addEventListener("click", () =>
      openQuestionBankDialog(
        questionBanks.find((bank) => bank._id === button.dataset.id),
      ),
    );
  });
  questionGroups.querySelectorAll(".delete-bank-btn").forEach((button) => {
    button.addEventListener("click", () =>
      deleteQuestionBank(button.dataset.id),
    );
  });
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
    const name = match[1].replace(/\.txt$/i, '');
    filename = `question_bank_${name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
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

function openEditDialog(question) {
  editingQuestionId = question._id;
  questionFormTitle.textContent = "Edit Question";
  questionFormError.textContent = "";
  qType.value = question.type;
  document.getElementById("q-text").value = question.question;
  document.getElementById("q-options").value = (question.options || []).join(
    "\n",
  );
  document.getElementById("q-correct-index").value =
    question.correctIndex ?? "";
  document.getElementById("q-correct-indexes").value = (
    question.correctIndexes || []
  ).join(",");
  document.getElementById("q-correct-boolean").value = String(
    question.correctAnswer ?? "true",
  );
  document.getElementById("q-correct-text").value =
    question.type === "short-answer" ? question.correctAnswer || "" : "";
  document.getElementById("q-case-sensitive").checked = Boolean(
    question.caseSensitive,
  );
  qQuestionBank.value = question.questionBank || "";
  updateTypeFields();
  questionDialog.showModal();
}

function buildQuestionPayload() {
  const type = qType.value;
  const payload = {
    type,
    question: document.getElementById("q-text").value,
    questionBank: qQuestionBank.value || null,
  };

  if (type === "multiple-choice" || type === "multi-select") {
    payload.options = document
      .getElementById("q-options")
      .value.split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (type === "multiple-choice") {
    payload.correctIndex = Number(
      document.getElementById("q-correct-index").value,
    );
  }

  if (type === "multi-select") {
    payload.correctIndexes = document
      .getElementById("q-correct-indexes")
      .value.split(",")
      .map((s) => s.trim())
      .filter((s) => s.length)
      .map(Number);
  }

  if (type === "true-false") {
    payload.correctAnswer =
      document.getElementById("q-correct-boolean").value === "true";
  }

  if (type === "short-answer") {
    payload.correctAnswer = document.getElementById("q-correct-text").value;
    payload.caseSensitive = document.getElementById("q-case-sensitive").checked;
  }

  return payload;
}

questionForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  questionFormError.textContent = "";

  const payload = buildQuestionPayload();
  const path = editingQuestionId
    ? `/api/admin/questions/${editingQuestionId}`
    : "/api/admin/questions";
  const method = editingQuestionId ? "PUT" : "POST";

  try {
    const res = await apiFetch(path, { method, body: JSON.stringify(payload) });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.details ? data.details.join("; ") : data.error || "Save failed",
      );
    }

    questionDialog.close();
    loadQuestions();
  } catch (err) {
    questionFormError.textContent = err.message;
  }
});

async function deleteQuestion(id) {
  if (!confirm("Delete this question?")) return;
  await apiFetch(`/api/admin/questions/${id}`, { method: "DELETE" });
  loadQuestions();
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
      questionBanks
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




// --- Question banks ---
const questionBankDialog = document.getElementById("question-bank-dialog");
const questionBankForm = document.getElementById("question-bank-form");
const questionBankFormTitle = document.getElementById(
  "question-bank-form-title",
);
const questionBankFormError = document.getElementById(
  "question-bank-form-error",
);
let editingQuestionBankId = null;

document
  .getElementById("new-question-bank-btn")
  .addEventListener("click", () => openQuestionBankDialog());
document
  .getElementById("question-bank-cancel-btn")
  .addEventListener("click", () => questionBankDialog.close());

function openQuestionBankDialog(questionBank) {
  editingQuestionBankId = questionBank?._id || null;
  questionBankFormTitle.textContent = questionBank
    ? "Edit Question Bank"
    : "New Question Bank";
  document.getElementById("question-bank-name").value =
    questionBank?.name || "";
  questionBankFormError.textContent = "";
  questionBankDialog.showModal();
}

questionBankForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  questionBankFormError.textContent = "";
  const path = editingQuestionBankId
    ? `/api/admin/question-banks/${editingQuestionBankId}`
    : "/api/admin/question-banks";

  try {
    const res = await apiFetch(path, {
      method: editingQuestionBankId ? "PUT" : "POST",
      body: JSON.stringify({
        name: document.getElementById("question-bank-name").value,
      }),
    });
    const data = await res.json();
    if (!res.ok)
      throw new Error(
        data.details ? data.details.join("; ") : data.error || "Save failed",
      );

    questionBankDialog.close();
    loadQuestions();
  } catch (err) {
    questionBankFormError.textContent = err.message;
  }
});

async function deleteQuestionBank(id) {
  if (
    !confirm("Delete this question bank? Its questions will remain unbanked.")
  )
    return;
  await apiFetch(`/api/admin/question-banks/${id}`, { method: "DELETE" });
  loadQuestions();
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
const usersTableBody = document.getElementById("users-table-body");
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

  usersTableBody.innerHTML = users
    .map(
      (u) => `
    <tr data-id="${u._id}">
      <td>${u.email}</td>
      <td>${u.role}</td>
      <td>${u._id === currentUser?.id ? "" : '<button type="button" class="delete-user-btn">Delete</button>'}</td>
    </tr>`,
    )
    .join("");

  usersTableBody.querySelectorAll(".delete-user-btn").forEach((btn) => {
    const id = btn.closest("tr").dataset.id;
    btn.addEventListener("click", () => deleteUser(id));
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
if (getToken()) {
  showDashboard();
} else {
  showLogin();
}


