import { renderTemplate } from "../../../js/template.js";
export async function renderPresentation(questions, renderQuestion) {
  const questionsContainer = document.getElementById("questions");
  for (let index = 0; index < questions.length; index++) {
    const html = await renderQuestion(questions[index], index);
    questionsContainer.insertAdjacentHTML("beforeend", html);
  }
  const submitHtml = await renderTemplate("/quiz/templates/quiz-submit.hbs");
  questionsContainer.insertAdjacentHTML("afterend", submitHtml);
}