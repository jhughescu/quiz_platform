const quizTitle = document.getElementById('quiz-title');
const questionsContainer = document.getElementById('questions');
const quizForm = document.getElementById('quiz-form');
const resultsContainer = document.getElementById('results');

let quizQuestions = [];

function getDeploymentId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

function renderQuestion(question, index) {
    const container = document.createElement('div');
    container.className = 'quiz-question';

    const heading = document.createElement('h2');
    heading.innerHTML = `${index + 1}. ${question.question}`;

    container.appendChild(heading);

    switch (question.type) {
        case 'multiple-choice':
        case 'true-false':
            renderRadioOptions(container, question);
            break;

        case 'multi-select':
            renderCheckboxOptions(container, question);
            break;

        case 'short-answer':
            renderShortAnswer(container, question);
            break;

        default:
            console.warn('Unknown question type:', question.type);
    }

    return container;
}

function renderRadioOptions(container, question) {
    question.options.forEach(option => {
        const label = document.createElement('label');

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = question.id;
        input.value = option.id;

        label.appendChild(input);
        label.appendChild(document.createTextNode(` ${option.text}`));

        container.appendChild(label);
        container.appendChild(document.createElement('br'));
    });
}

function renderCheckboxOptions(container, question) {
    question.options.forEach(option => {
        const label = document.createElement('label');

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.name = question.id;
        input.value = option.id;

        label.appendChild(input);
        label.appendChild(document.createTextNode(` ${option.text}`));

        container.appendChild(label);
        container.appendChild(document.createElement('br'));
    });
}

function renderShortAnswer(container, question) {
    const input = document.createElement('input');

    input.type = 'text';
    input.name = question.id;

    container.appendChild(input);
}

async function loadQuiz() {
    const deploymentId = getDeploymentId();

    if (!deploymentId) {
        quizTitle.textContent = 'Quiz not found';
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

        quiz.questions.forEach((question, index) => {
            questionsContainer.appendChild(
                renderQuestion(question, index)
            );
        });
    } catch (err) {
        console.error(err);
        quizTitle.textContent = 'Unable to load quiz';
    }
}

quizForm.addEventListener('submit', async event => {
    event.preventDefault();

    const answers = {};

    quizForm.querySelectorAll('input').forEach(input => {
        if (input.type === 'checkbox') {
            if (input.checked) {
                if (!answers[input.name]) {
                    answers[input.name] = [];
                }

                answers[input.name].push(input.value);
            }
        } else if (input.type === 'radio') {
            if (input.checked) {
                answers[input.name] = input.value;
            }
        } else {
            answers[input.name] = input.value;
        }
    });

    const deploymentId = getDeploymentId();

    try {
        console.log('Submitting:', {
            deploymentId,
            answers
        });
        const response = await fetch('/api/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                deploymentId,
                answers
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Server error:', error);
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

console.log('Submission result:', result);

let feedback = `
    <h2>Results</h2>
    <p>Score: ${result.score} / ${result.total}</p>
    <h3>Question Feedback</h3>
    <ul>
`;

result.results.forEach((item, index) => {
    const question = quizQuestions.find(
        q => q.id === item.questionId
    );

    const questionText = question
        ? question.question
        : `Question ${index + 1}`;

    feedback += `
        <li>
            <div class="result-question">${questionText}</div>
            <br>
            <span>
                ${item.correct ? 'Correct' : 'Incorrect'}
            </span>
        </li>
    `;
});

feedback += `
    </ul>
`;

resultsContainer.innerHTML = feedback;
    } catch (err) {
        console.error('Submission failed:', err);
    }
});

loadQuiz();