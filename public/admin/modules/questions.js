import { apiFetch } from "./api.js";
import { resetAdminTimeout } from "./session.js";

let editingQuestionId = null;
let qType = document.getElementById("q-type");

export function initNewQuestionButton() {
  const questionDialog = document.getElementById("question-dialog");
  const questionForm = document.getElementById("question-form");
  const questionFormTitle = document.getElementById("question-form-title");
  const questionFormError = document.getElementById("question-form-error");
  document.getElementById("new-question-btn").addEventListener("click", () => {
    editingQuestionId = null;
    qType.disabled = false;
    questionFormTitle.textContent = "New Question";
    questionForm.reset();
    updateTypeFields();
    questionFormError.textContent = "";
    questionDialog.showModal();
  });
}
export function initQuestionCancelButton() {
  const questionDialog = document.getElementById("question-dialog");
  document.getElementById("question-cancel-btn").addEventListener("click", () => {
    questionDialog.close();
  });
}
export function initQuestionTypeListener() {
  document.getElementById("q-type").addEventListener("change", updateTypeFields);
}
export function initQuestionForm({ apiFetch, loadQuestions }) {
  const questionForm = document.getElementById("question-form");
  const questionFormError = document.getElementById("question-form-error");
  const questionDialog = document.getElementById("question-dialog");
  questionForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    questionFormError.textContent = "";
    const payload = buildQuestionPayload();
    const editingQuestionId = getEditingQuestionId();
    const path = editingQuestionId
      ? `/api/admin/questions/${editingQuestionId}`
      : "/api/admin/questions";
    const method = editingQuestionId ? "PUT" : "POST";
    try {
      const res = await apiFetch(path, { method, body: JSON.stringify(payload) }, true);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.details ? data.details.join("; ") : data.error || "Save failed",
        );
      }
      questionDialog.close();
      resetAdminTimeout();
      loadQuestions();
    } catch (err) {
      questionFormError.textContent = err.message;
    }
  });
}
export async function deleteQuestion(id, loadQuestions) {
  if (!confirm("Delete this question?")) return;
  await apiFetch(`/api/admin/questions/${id}`, { method: "DELETE" }, true);
  resetAdminTimeout();
  loadQuestions();
}
export function updateTypeFields() {
  const type = document.getElementById("q-type").value;
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
export function openEditDialog(question) {
  editingQuestionId = question._id;
  const questionDialog = document.getElementById("question-dialog");
  const questionFormTitle = document.getElementById("question-form-title");
  const questionFormError = document.getElementById("question-form-error");
  const qQuestionBank = document.getElementById("q-question-bank");
  questionFormTitle.textContent = "Edit Question";
  questionFormError.textContent = "";
  qType.value = question.type;
  qType.disabled = true;
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
export function buildQuestionPayload() {
  const type = document.getElementById("q-type").value;
  const payload = {
    type,
    question: document.getElementById("q-text").value,
    questionBank: document.getElementById("q-question-bank").value || null,
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
export function getEditingQuestionId() {
  return editingQuestionId;
}