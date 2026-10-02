const quizTitle = document.getElementById("quiz-title");
const questionsContainer = document.getElementById("questions");
const quizForm = document.getElementById("quiz-form");
const resultsContainer = document.getElementById("results");

let quizQuestions = [];
let reviewToken = sessionStorage.getItem("quizReviewToken");
let quizTemplateId = "default";

function getDeploymentId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

async function requestReviewCredentials() {
  const email = prompt("Reviewer email:");
  if (!email) {
    return;
  }
  const password = prompt("Reviewer password:");
  if (!password) {
    return;
  }
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      throw new Error("Invalid email or password");
    }
    const data = await response.json();
    reviewToken = data.token;
    sessionStorage.setItem("quizReviewToken", reviewToken);
    await loadQuiz();
  } catch (err) {
    console.error("Review authentication failed:", err);
  }
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function getTemplatePath(templateId, templateName) {
  const defaultPath = `/quiz/templates/${templateName}.hbs`;
  if (!templateId || templateId === "default") {
    return defaultPath;
  }
  const overridePath = `/quiz/templates/${templateId}/${templateName}.hbs`;
  const response = await fetch(overridePath, { method: "HEAD" });
  return response.ok ? overridePath : defaultPath;
}

async function renderQuestion(
  question,
  index,
  randomiseOptions,
  review,
  templateId,
) {
  if (question.options && randomiseOptions) {
    question = {
      ...question,
      options: shuffle([...question.options]),
    };
  }
  switch (question.type) {
    case "multiple-choice":
    case "true-false":
    case "multi-select":
    case "short-answer":
      break;
    default:
      console.warn("Unknown question type:", question.type);
      return "";
  }
  return renderTemplate(await getTemplatePath(templateId, "quiz-question"), {
    ...question,
    index,
    review,
  });
}
document.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "a") {
    event.preventDefault();
    if (reviewToken) {
      reviewToken = null;
      sessionStorage.removeItem("quizReviewToken");
      document.body.classList.remove("review-mode");
      loadQuiz();
    } else {
      requestReviewCredentials();
    }
  }
});
async function loadQuiz() {
  const deploymentId = getDeploymentId();
  if (!deploymentId) {
    quizTitle.textContent = "Quiz not found";
    return;
  }
  try {
    const response = await fetch(
      reviewToken
        ? `/api/quiz/${deploymentId}/review`
        : `/api/quiz/${deploymentId}`,
      reviewToken
        ? {
            headers: {
              Authorization: `Bearer ${reviewToken}`,
            },
          }
        : {},
    );
    if (!response.ok) {
      if (response.status === 401 && reviewToken) {
        reviewToken = null;
        sessionStorage.removeItem("quizReviewToken");
        document.body.classList.remove("review-mode");
        await loadQuiz();
        return;
      }
      throw new Error(`HTTP ${response.status}`);
    }
    const quiz = await response.json();
    quizTemplateId = quiz.template?.id || "default";
    quizTitle.textContent = quiz.name;
    document.body.classList.toggle("review-mode", Boolean(reviewToken));
    quizQuestions = quiz.randomiseQuestions
      ? shuffle([...quiz.questions])
      : quiz.questions;

    questionsContainer.innerHTML = "";
    for (let index = 0; index < quizQuestions.length; index++) {
      const question = quizQuestions[index];
      const html = await renderQuestion(
        question,
        index,
        quiz.randomiseOptions,
        Boolean(reviewToken),
        quiz.template?.id,
      );
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
    const templateData = prepareQuizResults(result);
    resultsContainer.innerHTML = await renderTemplate(
      await getTemplatePath(quizTemplateId, "quiz-results"),
      templateData,
    );
  } catch (err) {
    console.error("Submission failed:", err);
  }
});

loadQuiz();
