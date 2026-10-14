import { apiFetch } from "./api.js";

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

export function openQuestionBankDialog(questionBank) {
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
    await refreshQuestions();
  } catch (err) {
    console.error("Question-bank save/refresh failed:", err);
    questionBankFormError.textContent = err.message;
  }
});
let questionBanks = [];
const qQuestionBank = document.getElementById("q-question-bank");
export async function loadQuestionBanks() {
  const response = await apiFetch("/api/admin/question-banks");
  questionBanks = await response.json();
  renderQuestionBankOptions();
}
export function getQuestionBanks() {
  return questionBanks;
}
export function renderDeploymentQuestionBanks() {
  const select = document.getElementById("deployment-question-bank");
  if (!select) return;
  select.innerHTML =
    '<option value="">Select a question bank</option>' +
    questionBanks
      .map((bank) => `<option value="${bank._id}">${bank.name}</option>`)
      .join("");
}
function renderQuestionBankOptions() {
  qQuestionBank.innerHTML =
    '<option value="">Unbanked</option>' +
    questionBanks
      .map((bank) => `<option value="${bank._id}">${bank.name}</option>`)
      .join("");
}
export async function deleteQuestionBank(id, loadQuestions) {
  if (
    !confirm("Delete this question bank? Its questions will remain unbanked.")
  )
    return;
  await apiFetch(`/api/admin/question-banks/${id}`, { method: "DELETE" });
  loadQuestions();
}
let refreshQuestions;
export function initQuestionBanks({ loadQuestions }) {
  refreshQuestions = loadQuestions;
}
