const presentations = {
  default: {
    mode: "all",
    navigation: false,
    progress: false,
  },
  "one-at-a-time": {
    mode: "single",
    navigation: true,
    progress: true,
  },
};
function getPresentation(id) {
  return presentations[id] || presentations.default;
}
async function renderPresentation(
  presentation,
  questions,
  renderQuestion,
  submitQuestion,
) {
  const questionsContainer = document.getElementById("questions");
  if (presentation.mode === "all") {
    for (let index = 0; index < questions.length; index++) {
      const html = await renderQuestion(
        questions[index],
        index,
        submittedQuestions.has(questions[index].id),
      );
      questionsContainer.insertAdjacentHTML("beforeend", html);
    }
    return;
  }
  if (presentation.mode === "single") {
    let currentIndex = 0;
    const answers = {};
    const submittedQuestions = new Set();
    async function showQuestion(index) {
      const html = await renderQuestion(
        {
          ...questions[index],
          submitted: submittedQuestions.has(questions[index].id),
        },
        index,
      );
      questionsContainer.innerHTML = html;
      restoreAnswer(questions[index]);
      await renderNavigation();
    }
    async function saveAnswer(question) {
      const inputs = questionsContainer.querySelectorAll("input");
      let answer;
      if (question.type === "multi-select") {
        answer = Array.from(inputs)
          .filter((input) => input.checked)
          .map((input) => input.value);
      } else if (question.type === "short-answer") {
        answer = inputs[0]?.value || "";
      } else {
        const input = Array.from(inputs).find((input) => input.checked);
        if (!input) {
          return;
        }
        answer = input.value;
      }
      answers[question.id] = answer;
      const submission = await submitQuestion(question.id, answer);
      submittedQuestions.add(question.id);
      const submitButton = questionsContainer.querySelector(".quiz-submit");
      if (submitButton) {
        submitButton.disabled = true;
      }
      return submission;
    }
    function restoreAnswer(question) {
      const savedAnswer = answers[question.id];
      if (savedAnswer === undefined) {
        return;
      }
      const inputs = questionsContainer.querySelectorAll("input");
      if (question.type === "multi-select") {
        inputs.forEach((input) => {
          input.checked = savedAnswer.includes(input.value);
        });
        return;
      }
      if (question.type === "short-answer") {
        inputs[0].value = savedAnswer;
        return;
      }
      inputs.forEach((input) => {
        input.checked = input.value === savedAnswer;
      });
    }
    function addSavedAnswersToForm() {
      const quizForm = document.getElementById("quiz-form");
      quizForm
        .querySelectorAll(".presentation-saved-answer")
        .forEach((input) => input.remove());
      questions.forEach((question) => {
        const savedAnswer = answers[question.id];
        if (savedAnswer === undefined) {
          return;
        }
        if (question.type === "multi-select") {
          savedAnswer.forEach((value) => {
            const input = document.createElement("input");
            input.type = "checkbox";
            input.name = question.id;
            input.value = value;
            input.checked = true;
            input.className = "presentation-saved-answer";
            input.hidden = true;
            quizForm.appendChild(input);
          });
          return;
        }
        const input = document.createElement("input");
        input.type = "radio";
        input.name = question.id;
        input.value = savedAnswer;
        input.checked = true;
        input.className = "presentation-saved-answer";
        input.hidden = true;
        quizForm.appendChild(input);
      });
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
      nextButton.addEventListener("click", async () => {
        currentIndex++;
        await showQuestion(currentIndex);
      });
      previousButton.addEventListener("click", async () => {
        currentIndex--;
        await showQuestion(currentIndex);
      });
      submitButton.addEventListener("click", async (event) => {
        event.preventDefault();
        await saveAnswer(questions[currentIndex]);
      });
    }
    await showQuestion(currentIndex);
  }
}
