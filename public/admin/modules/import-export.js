import { apiFetch } from "./api.js";
import { resetAdminTimeout } from "./session.js";

const exportButtonFull = document.getElementById("export-questions-btn");
const importDialog = document.getElementById("import-dialog");
const importForm = document.getElementById("import-form");
const importFormError = document.getElementById("import-form-error");
const importFormDetails = document.getElementById("import-form-details");
const importQuestionBank = document.getElementById("import-question-bank");
const importFile = document.getElementById("import-file");
export async function exportAllQuestions() {
  resetAdminTimeout();
  const res = await apiFetch(`/api/admin/export-all-questions`, {}, true);
  if (!res.ok) {
    throw new Error(`Export failed: ${res.status}`);
  }
  const blob = await res.blob();
  const filename = `all-questions.txt`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
export function initExportAllQuestions() {
  exportButtonFull.addEventListener("click", () => {
    exportAllQuestions();
  });
}
export async function exportQuestionBank(bankId) {
  resetAdminTimeout();
  const res = await apiFetch(`/api/admin/export-question-bank/${bankId}`, {}, true);
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
export function initImport({ loadQuestions, getQuestionBanks }) {
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
    resetAdminTimeout();
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
      }, true);
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
}
