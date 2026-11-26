import { apiFetch } from "./api.js";
import { resetAdminTimeout } from "./session.js";
import { renderTemplate } from "../../js/template.js";

let editingQuestionId = null;
let qType = document.getElementById("q-type");
let selectedImageFile = null;
let imagePreviewUrl = null;
let existingImageId = null;

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
    selectedImageFile = null;
    existingImageId = null;
    updateImagePreview(null);
    updateTypeFields();
    questionFormError.textContent = "";
    questionDialog.showModal();
  });
  document.getElementById("q-image").addEventListener("change", (e) => {
    const file = e.target.files[0] || null;
    updateImagePreview(file);
  });
  document
    .getElementById("q-image-remove-btn")
    .addEventListener("click", () => {
      document.getElementById("q-image").value = "";
      existingImageId = null;
      updateImagePreview(null);
    });
}
export function initQuestionCancelButton() {
  const questionDialog = document.getElementById("question-dialog");
  document
    .getElementById("question-cancel-btn")
    .addEventListener("click", () => {
      questionDialog.close();
    });
}
export function initQuestionTypeListener() {
  document
    .getElementById("q-type")
    .addEventListener("change", updateTypeFields);
}
export function initQuestionForm({ apiFetch, loadQuestions }) {
  const questionForm = document.getElementById("question-form");
  const questionFormError = document.getElementById("question-form-error");
  const questionDialog = document.getElementById("question-dialog");
  const imagePickerDialog = document.getElementById("image-picker-dialog");
  const imagePickerGallery = document.getElementById("image-picker-gallery");
  const imageInput = document.getElementById("q-image");
  async function openImagePicker() {
    imagePickerGallery.textContent = "Loading images...";
    imagePickerDialog.showModal();
    try {
      const res = await apiFetch("/api/admin/images", {}, true);
      if (!res.ok) {
        throw new Error("Failed to load images");
      }
      const images = await res.json();
      imagePickerGallery.innerHTML = await renderTemplate(
        "/admin/templates/image-gallery.hbs",
        {
          images: images.map((image) => ({
            ...image,
            displayDate: new Date(image.createdAt).toLocaleDateString(),
          })),
        },
      );
      imagePickerGallery.querySelectorAll("[data-image-id]").forEach((item) => {
        item.addEventListener("click", () => {
          existingImageId = item.dataset.imageId;
          imageInput.value = "";
          displayExistingImage(existingImageId);
          imagePickerDialog.close();
        });
      });
    } catch (err) {
      imagePickerGallery.textContent = err.message;
    }
  }
  document
    .getElementById("q-image-library-btn")
    .addEventListener("click", openImagePicker);
  document
    .getElementById("image-picker-close-btn")
    .addEventListener("click", () => imagePickerDialog.close());
  questionForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    questionFormError.textContent = "";
    try {
      const payload = buildQuestionPayload();
      if (selectedImageFile) {
        const formData = new FormData();
        formData.append("image", selectedImageFile);
        const uploadRes = await apiFetch(
          "/api/admin/images",
          { method: "POST", body: formData },
          true,
        );
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || "Image upload failed");
        }
        payload.image = uploadData.id;
      } else {
        payload.image = existingImageId;
      }
      const editingQuestionId = getEditingQuestionId();
      const path = editingQuestionId
        ? `/api/admin/questions/${editingQuestionId}`
        : "/api/admin/questions";
      const method = editingQuestionId ? "PUT" : "POST";
      const res = await apiFetch(
        path,
        { method, body: JSON.stringify(payload) },
        true,
      );
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
function updateImagePreview(file) {
  const previewContainer = document.getElementById("q-image-preview-container");
  const preview = document.getElementById("q-image-preview");
  if (imagePreviewUrl) {
    URL.revokeObjectURL(imagePreviewUrl);
    imagePreviewUrl = null;
  }
  selectedImageFile = file;
  if (!file) {
    preview.removeAttribute("src");
    previewContainer.hidden = true;
    return;
  }
  imagePreviewUrl = URL.createObjectURL(file);
  preview.src = imagePreviewUrl;
  previewContainer.hidden = false;
}
function displayExistingImage(imageId) {
  const previewContainer = document.getElementById("q-image-preview-container");
  const preview = document.getElementById("q-image-preview");
  if (imagePreviewUrl) {
    URL.revokeObjectURL(imagePreviewUrl);
    imagePreviewUrl = null;
  }
  selectedImageFile = null;
  if (!imageId) {
    preview.removeAttribute("src");
    previewContainer.hidden = true;
    return;
  }
  preview.src = `/api/images/${imageId}`;
  previewContainer.hidden = false;
}

export function openEditDialog(question) {
  editingQuestionId = question._id;
  existingImageId = question.image?._id || question.image || null;
  document.getElementById("q-image").value = "";
  displayExistingImage(existingImageId);
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
