import { getCookie, showErrorMessage } from './utils.js';

const socket = io();

const answersFormEl = document.getElementById('answers-form');
const multipleChoiceAreaEl = document.getElementById('multiple-choice-area');
const shortAnswerAreaEl = document.getElementById('short-answer-area');
const shortAnswerTextEl = document.getElementById('short-answer');
const questionTextEl = document.getElementById('question');
const questionNumEl = document.getElementById('q-num');
const backButtonEl = document.getElementById('back-btn');
const nextButtonEl = document.getElementById('next-btn');
const submitQuestionsForm = document.getElementById('submit-questions-form');

const guessWhoRoomId = JSON.parse(getCookie('guessWhoRoomId'));
const code = guessWhoRoomId.code;
const id = guessWhoRoomId.id;

let thisPlayer;
let currentQuestionType;
let uniqueId = 0;

let questions;
let questionNumber = 0;
let answers = new Map();

// browser's back and forward click listener
window.addEventListener('popstate', event => {
  const state = history.state;
  if (!state || state.id === undefined) {
    window.location.href = '/';
    return;
  }
  event.preventDefault();
  if (state.id < questionNumber) {
    showQuestion(--questionNumber);
  } else {
    showQuestion(++questionNumber);
  }
});

socket.emit('reconnectPlayer', { code: code, id: id });

socket.on('getPlayerInfo', playerJSON => {
  console.log('getPlayerInfo');
  thisPlayer = playerJSON;
  socket.emit('getQuestions', { code: code, player: thisPlayer });
});

socket.on('getQuestions', data => {
  questions = data;
  showQuestion(questionNumber);
  history.pushState({ id: questionNumber }, '');
});

socket.on('updateRoundOver', () => {
  console.log('updateRoundOver');
});

answersFormEl.addEventListener('submit', event => {
  event.preventDefault();
  const answer = getAnswerFromForm();
  if (answer === '') {
    showErrorMessage('warning', 'אנא השב/י על השאלה', 2000);
    if (answers.size === questions.length) {
      // hide and disable submit button
      submitQuestionsForm.querySelector('input').classList.add('hidden');
      submitQuestionsForm.querySelector('input').setAttribute('disabled', '');
    }
    return;
  }

  const question = questions[questionNumber];
  answers.set(question, answer);
  if (answers.size === questions.length) {
    // show and enable submit button
    submitQuestionsForm.querySelector('input').classList.remove('hidden');
    submitQuestionsForm.querySelector('input').removeAttribute('disabled');

    return;
  }
  if (questions.length <= questionNumber + 1) {
    return;
  }
  showQuestion(++questionNumber);
  history.pushState({ id: questionNumber }, '');
});

submitQuestionsForm.addEventListener('submit', event => {
  event.preventDefault();
  socket.emit('updateDoneAnswering', {
    code: code,
    answers: answers,
    player: thisPlayer
  });
});

function getAnswerFromForm() {
  if (currentQuestionType === 'multipleChoice') {
    const checkedButton = answersFormEl.querySelector(
      'input[name="answer"]:checked'
    );
    if (checkedButton) {
      return checkedButton.value;
    }
    return '';
  } else if (currentQuestionType === 'shortAnswer') {
    return document.getElementById('short-answer').value;
  }
}

function setAnswer(question, answer) {
  if (question.type === 'multipleChoice') {
    for (const input of answersFormEl.querySelectorAll('input')) {
      if (input.value === answer) {
        input.checked = true;
      }
    }
  } else if (currentQuestionType === 'shortAnswer') {
    document.getElementById('short-answer').value = answer;
  }
}

function showQuestion(i) {
  const question = questions[i];
  clearLastQuestion();
  addQuestion(question, i + 1);
  if (answers.has(question)) {
    setAnswer(question, answers.get(question));
  }
  if (i === 0) {
    backButtonEl.style.display = 'none';
  } else if (i == 1) {
    backButtonEl.style.display = 'inline-block';
  } else if (i + 1 === questions.length - 1) {
    nextButtonEl.style.display = 'inline-block';
  } else if (i + 1 == questions.length) {
    nextButtonEl.style.display = 'none';
  }
}

function clearLastQuestion() {
  if (currentQuestionType === 'multipleChoice') {
    multipleChoiceAreaEl.style.display = 'none';
    multipleChoiceAreaEl.innerHTML = '';
  } else if (currentQuestionType === 'shortAnswer') {
    shortAnswerAreaEl.style.display = 'none';
    shortAnswerTextEl.value = '';
  }
}

function addQuestion({ question, type, choices }, questionNum) {
  questionNumEl.textContent = questionNum;
  questionTextEl.textContent = question;
  currentQuestionType = type;
  if (type === 'multipleChoice') {
    multipleChoiceAreaEl.style.display = 'flex';
    addMultipleChoices(choices);
  } else if (type === 'shortAnswer') {
    addShortAnswer();
  }
}

function addShortAnswer(question) {
  shortAnswerAreaEl.style.display = 'block';
}

function addMultipleChoices(choices) {
  if (!choices) {
    choices = ['👍', '👎'];
  }
  choices.forEach(choice => {
    addChoiceElement(choice);
  });
}

function addChoiceElement(choice) {
  const choiceEl = createChoiceElement(choice);
  multipleChoiceAreaEl.appendChild(choiceEl);
}

function createChoiceElement(choice) {
  const choiceID = 'a' + uniqueId++;
  const newChoiceEl = document.createElement('div');
  newChoiceEl.classList.add('choice-item');
  newChoiceEl.innerHTML = `
  <label for="${choiceID}">${choice} 
    <input type="radio" name="answer" value="${choice}" id="${choiceID}">
    <span class="radio">
  </label>
  `;
  newChoiceEl.querySelector('input').addEventListener('click', () => {
    answersFormEl.dispatchEvent(new Event('submit'));
  });
  return newChoiceEl;
}

backButtonEl.addEventListener('click', () => {
  history.back();
});

nextButtonEl.addEventListener('click', () => {
  showQuestion(++questionNumber);
  history.pushState({ id: questionNumber }, '');
});
