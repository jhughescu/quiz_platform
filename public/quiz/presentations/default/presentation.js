export async function renderPresentation(questions, renderQuestion) {
  const questionsContainer = document.getElementById("questions");
  for (let index = 0; index < questions.length; index++) {
    const html = await renderQuestion(questions[index], index);
    questionsContainer.insertAdjacentHTML("beforeend", html);
  }
}