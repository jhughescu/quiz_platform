const quizTitle = document.getElementById("quiz-title");
const questionsContainer = document.getElementById("questions");
const quizForm = document.getElementById("quiz-form");
const resultsContainer = document.getElementById("results");

let quizQuestions = [];

function getDeploymentId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
async function renderQuestion(question, index) {
  let inputType = "radio";
  let isShortAnswer = false;
  if (question.hasOwnProperty('options')) {
    question.options = shuffle(question.options);
  }
  switch (question.type) {
    case "multiple-choice":
    case "true-false":
      inputType = "radio";
      break;
    case "multi-select":
      inputType = "checkbox";
      break;
    case "short-answer":
      isShortAnswer = true;
      break;
    default:
      console.warn("Unknown question type:", question.type);
      return "";
  }
  return renderTemplate("/quiz/templates/quiz-question.hbs", {
    ...question,
    index,
    inputType,
    isShortAnswer,
  });
}
async function loadQuiz() {
  const deploymentId = getDeploymentId();
  if (!deploymentId) {
    quizTitle.textContent = "Quiz not found";
    return;
  }
  try {
    const response = await fetch(`/api/quiz/${deploymentId}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const quiz = await response.json();
    quizTitle.textContent = quiz.name;
    quizQuestions = quiz.questions;
    for (let index = 0; index < quiz.questions.length; index++) {
      const question = quiz.questions[index];
      const html = await renderQuestion(question, index);
      questionsContainer.insertAdjacentHTML("beforeend", html);
    }
  } catch (err) {
    console.error(err);
    quizTitle.textContent = "Unable to load quiz";
  }
}

function prepareQuizResults(result) {
  const results = result.results.map((item, index) => {
    const question = quizQuestions.find((q) => q.id === item.questionId);

    return {
      ...item,
      questionText: question ? question.question : `Question ${index + 1}`,
    };
  });

  return {
    score: result.score,
    total: result.total,
    results,
  };
}

function collectAnswers() {
  const answers = {};

  quizForm.querySelectorAll("input").forEach((input) => {
    if (input.type === "checkbox") {
      if (input.checked) {
        if (!answers[input.name]) {
          answers[input.name] = [];
        }

        answers[input.name].push(input.value);
      }
    } else if (input.type === "radio") {
      if (input.checked) {
        answers[input.name] = input.value;
      }
    } else {
      answers[input.name] = input.value;
    }
  });

  return answers;
}

quizForm.addEventListener("submit", async (event) => {
  event.preventDefault();
 
  const answers = collectAnswers();
  const deploymentId = getDeploymentId();
  try {
    console.log("Submitting:", {
      deploymentId,
      answers,
    });
    const response = await fetch("/api/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        deploymentId,
        answers,
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      console.error("Server error:", error);
      throw new Error(`HTTP ${response.status}`);
    }
    const result = await response.json();
    console.log("Submission result:", result);
    const templateData = prepareQuizResults(result);
    resultsContainer.innerHTML = await renderTemplate(
      "/quiz/templates/quiz-results.hbs",
      templateData,
    );
  } catch (err) {
    console.error("Submission failed:", err);
  }
});



loadQuiz();
