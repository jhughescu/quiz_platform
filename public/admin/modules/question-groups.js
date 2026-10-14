import { getQuestionBanks, openQuestionBankDialog, deleteQuestionBank } from "./question-banks.js";
import { openEditDialog, deleteQuestion } from "./questions.js";
import { renderTemplate } from "../../js/template.js";
export async function renderQuestionGroups(questions, { questionGroups, loadQuestions, exportQuestionBank, showOwner }) {
  const unbankedQuestions = questions.filter((question) => !question.questionBank);
  const groups = [
    {
      name: "Unbanked Questions",
      questions: unbankedQuestions,
      bank: null,
    },
    ...getQuestionBanks().map((bank) => ({
      name: bank.name,
      questions: questions.filter((question) => question.questionBank === bank._id),
      bank,
    })),
  ];
  const groupData = groups.map((group) => ({
    ...group,
    showOwner,
    ownerEmail: group.bank?.createdBy?.email || "Unknown",
    questions: group.questions.map((question) => ({
      ...question,
      ownerEmail: question.createdBy?.email || "Unknown",
    })),
  }));
  questionGroups.innerHTML = await renderTemplate("/admin/templates/question-groups.hbs", {
    groups: groupData,
    showOwner,
  });
  questionGroups.querySelectorAll("tr[data-id]").forEach((row) => {
    const id = row.dataset.id;
    const question = questions.find((q) => q._id === id);
    row.querySelector(".edit-btn").addEventListener("click", () => openEditDialog(question));
    row.querySelector(".delete-btn").addEventListener("click", () => deleteQuestion(id, loadQuestions));
  });
  questionGroups.querySelectorAll(".export-bank-btn").forEach((button) => {
    button.addEventListener("click", () => exportQuestionBank(button.dataset.id));
  });
  questionGroups.querySelectorAll(".edit-bank-btn").forEach((button) => {
    button.addEventListener("click", () => openQuestionBankDialog(getQuestionBanks().find((bank) => bank._id === button.dataset.id)));
  });
  questionGroups.querySelectorAll(".delete-bank-btn").forEach((button) => {
    button.addEventListener("click", () => deleteQuestionBank(button.dataset.id, loadQuestions));
  });
}