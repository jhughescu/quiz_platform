import { apiFetch } from "./api.js";
import { renderTemplate } from "../../js/template.js";
import { resetAdminTimeout } from "./session.js";

const questionBankDialog = document.getElementById("question-bank-dialog");
const questionBankForm = document.getElementById("question-bank-form");
const deleteQuestionBankDialog = document.getElementById("delete-question-bank-dialog");
const confirmDeleteQuestionBankDialog = document.getElementById("confirm-delete-question-bank-dialog");
const deleteQuestionBankMessage = document.getElementById("delete-question-bank-message");
const deleteBankCancelBtn = document.getElementById("delete-bank-cancel-btn");
const deleteBankQuestionsBtn = document.getElementById("delete-bank-questions-btn");
const unbankQuestionsBtn = document.getElementById("unbank-questions-btn");
const confirmDeleteBankCancelBtn = document.getElementById("confirm-delete-bank-cancel-btn");
const confirmDeleteBankBtn = document.getElementById("confirm-delete-bank-btn");
const questionBankFormTitle = document.getElementById(
  "question-bank-form-title",
);
const questionBankFormError = document.getElementById(
  "question-bank-form-error",
);
let editingQuestionBankId = null;
let deletingQuestionBankId = null;
let selectedDeletionAction = null;
let reloadQuestions = null;

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
    }, true);
    const data = await res.json();
    if (!res.ok)
      throw new Error(
        data.details ? data.details.join("; ") : data.error || "Save failed",
      );

    questionBankDialog.close();
    resetAdminTimeout();
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
export async function renderDeploymentQuestionBanks() {
  const select = document.getElementById("deployment-question-bank");
  if (!select) return;
  select.innerHTML = await renderTemplate(
    "/admin/templates/deployment-question-bank-options.hbs",
    {
      questionBanks: questionBanks.map((bank) => ({
        ...bank,
        questionCount: bank.questionCount ?? 0,
      })),
    },
  );
}
async function renderQuestionBankOptions() {
  qQuestionBank.innerHTML = await renderTemplate(
    "/admin/templates/question-bank-options.hbs",
    { questionBanks },
  );
}
export async function deleteQuestionBank(id, loadQuestions) {
  const bank = questionBanks.find((item) => item._id === id);
  if (!bank) return;
  deletingQuestionBankId = id;
  reloadQuestions = loadQuestions;
  selectedDeletionAction = null;
  deleteQuestionBankMessage.textContent =
    `This question bank contains ${bank.questionCount ?? 0} questions. Would you like to delete these or move them to 'unbanked'?`;
  deleteQuestionBankDialog.showModal();
}
deleteBankCancelBtn.addEventListener("click", () => {
  deleteQuestionBankDialog.close();
});
deleteBankQuestionsBtn.addEventListener("click", () => {
  selectedDeletionAction = "delete";
  deleteQuestionBankDialog.close();
  confirmDeleteQuestionBankDialog.showModal();
});
unbankQuestionsBtn.addEventListener("click", () => {
  selectedDeletionAction = "unbank";
  deleteQuestionBankDialog.close();
  confirmDeleteQuestionBankDialog.showModal();
});
confirmDeleteBankCancelBtn.addEventListener("click", () => {
  confirmDeleteQuestionBankDialog.close();
});
confirmDeleteBankBtn.addEventListener("click", async () => {
  try {
    await apiFetch(
      `/api/admin/question-banks/${deletingQuestionBankId}?action=${selectedDeletionAction}`,
      { method: "DELETE" },
      true,
    );
    confirmDeleteQuestionBankDialog.close();
    resetAdminTimeout();
    await reloadQuestions();
  } catch (err) {
    console.error("Question-bank deletion failed:", err);
    confirmDeleteQuestionBankDialog.close();
    alert(err.message || "Question-bank deletion failed.");
  } finally {
    deletingQuestionBankId = null;
    selectedDeletionAction = null;
    reloadQuestions = null;
  }
});
let refreshQuestions;
export function initQuestionBanks({ loadQuestions }) {
  refreshQuestions = loadQuestions;
}
