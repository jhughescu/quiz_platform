import { renderTemplate } from "../../../js/template.js";
export async function renderPresentation(
  questions,
  renderQuestion,
  submitQuestion,
) {
  const questionsContainer = document.getElementById("questions");
  let currentIndex = 0;
  const answers = {};
  const submittedQuestions = new Set();
  const submittingQuestions = new Set();
  async function showQuestion(index) {
    const question = questions[index];
    const html = await renderQuestion(
      {
        ...question,
        submitted: submittedQuestions.has(question.id),
      },
      index,
    );
    questionsContainer.innerHTML = html;
    restoreAnswer(question);
    await renderNavigation();
  }
  async function saveAnswer(question) {
    if (
      submittingQuestions.has(question.id) ||
      submittedQuestions.has(question.id)
    ) {
      return;
    }
    const inputs = Array.from(questionsContainer.querySelectorAll("input"));
    let answer;
    if (question.type === "multi-select") {
      answer = inputs
        .filter((input) => input.checked)
        .map((input) => input.value);
    } else if (question.type === "short-answer") {
      answer = inputs[0]?.value || "";
    } else {
      answer = inputs.find((input) => input.checked)?.value;
      if (answer === undefined) {
        return;
      }
    }
    const submitButton = questionsContainer.querySelector(".quiz-submit");
    if (submitButton) {
      submitButton.disabled = true;
    }
    submittingQuestions.add(question.id);
    try {
      answers[question.id] = answer;
      await submitQuestion(question.id, answer);
      submittedQuestions.add(question.id);
    } catch (error) {
      if (submitButton) {
        submitButton.disabled = false;
      }
      throw error;
    } finally {
      submittingQuestions.delete(question.id);
    }
  }
  function restoreAnswer(question) {
    const savedAnswer = answers[question.id];
    if (savedAnswer === undefined) {
      return;
    }
    const inputs = Array.from(questionsContainer.querySelectorAll("input"));
    if (question.type === "multi-select") {
      inputs.forEach((input) => {
        input.checked = savedAnswer.includes(input.value);
      });
    } else if (question.type === "short-answer") {
      if (inputs[0]) {
        inputs[0].value = savedAnswer;
      }
    } else {
      inputs.forEach((input) => {
        input.checked = input.value === savedAnswer;
      });
    }
  }
  async function renderNavigation() {
    const html = await renderTemplate("/quiz/templates/quiz-navigation.hbs", {
      currentIndex,
      totalQuestions: questions.length,
      submitted: submittedQuestions.has(questions[currentIndex].id),
    });
    questionsContainer.insertAdjacentHTML("beforeend", html);
    const navigation = questionsContainer.querySelector(".quiz-navigation");
    const previousButton = navigation.querySelector(".quiz-previous");
    const nextButton = navigation.querySelector(".quiz-next");
    const submitButton = navigation.querySelector(".quiz-submit");
    previousButton.disabled = currentIndex === 0;
    nextButton.disabled = currentIndex === questions.length - 1;
    async function goToNextQuestion() {
      currentIndex++;
      await showQuestion(currentIndex);
    }
    async function goToPreviousQuestion() {
      currentIndex--;
      await showQuestion(currentIndex);
    }
    async function handleSubmit(event) {
      event.preventDefault();
      await saveAnswer(questions[currentIndex]);
    }
    nextButton.addEventListener("click", goToNextQuestion);
    previousButton.addEventListener("click", goToPreviousQuestion);
    submitButton.addEventListener("click", handleSubmit);
  }
  await showQuestion(currentIndex);
}
