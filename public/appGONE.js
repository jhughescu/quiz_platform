const quizEl = document.getElementById('quiz');
const submitBtn = document.getElementById('submit-btn');
const resultEl = document.getElementById('result');

let questions = [];

async function loadQuestions() {
  console.log
  const res = await fetch('/api/questions');
  questions = await res.json();
  renderQuestions();
}

function renderOptionsInput(q, inputType) {
  return q.options
    .map(
      (opt, i) => `
    <label>
      <input type="${inputType}" name="q-${q.id}" value="${i}" />
      ${opt}
    </label>`
    )
    .join('');
}

function renderQuestionBody(q) {
  switch (q.type) {
    case 'multiple-choice':
    case 'true-false':
      return renderOptionsInput(q, 'radio');
    case 'multi-select':
      return renderOptionsInput(q, 'checkbox');
    case 'short-answer':
      return `<input type="text" name="q-${q.id}" />`;
    default:
      return '';
  }
}

function renderQuestions() {
  console.log('Rendering questions:', questions);
  quizEl.innerHTML = questions
    .map(
      (q) => `
    <div class="question" data-id="${q.id}">
      <p>${q.question}</p>
      <div class="options">
        ${renderQuestionBody(q)}
      </div>
    </div>`
    )
    .join('');
}

function readAnswer(q) {
  switch (q.type) {
    case 'multiple-choice':
    case 'true-false': {
      const selected = document.querySelector(`input[name="q-${q.id}"]:checked`);
      if (!selected) return undefined;
      return q.type === 'true-false' ? selected.value === '0' : Number(selected.value);
    }
    case 'multi-select': {
      const checked = document.querySelectorAll(`input[name="q-${q.id}"]:checked`);
      return checked.length ? Array.from(checked).map((el) => Number(el.value)) : undefined;
    }
    case 'short-answer': {
      const input = document.querySelector(`input[name="q-${q.id}"]`);
      return input && input.value.trim() ? input.value : undefined;
    }
    default:
      return undefined;
  }
}

async function submitAnswers() {
  const answers = {};
  questions.forEach((q) => {
    const value = readAnswer(q);
    if (value !== undefined) {
      answers[q.id] = value;
    }
  });

  const res = await fetch('/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers })
  });

  const data = await res.json();
  resultEl.textContent = `You scored ${data.score} / ${data.total}`;
}

submitBtn.addEventListener('click', submitAnswers);
console.log('Loading questions...');
loadQuestions();
