import { getCookie } from './utils.js';

const socket = io();

const answersFormEl = document.getElementById('answers-form');
const multipleChoiceAreaEl = document.getElementById('multiple-choice-area');
const shortAnswerAreaEl = document.getElementById('short-answer-area');
const shortAnswerTextEl = document.getElementById('short-answer');
const questionTextEl = document.getElementById('question');
const questionNumEl = document.getElementById('q-num');

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
    questionNumber;
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

answersFormEl.addEventListener('submit', event => {
  event.preventDefault();
  const answer = getAnswerFromForm();
  if (answer === '') {
    return;
  }
  if (questions.length <= questionNumber + 1) {
    // TODO: emit finished answering and wait for other players
    // to finish, or redirect to the guessing part if you're the
    // last one to finish
    alert('דיי. נגמר.');
    return;
  }
  const question = questions[questionNumber];
  answers.set(question, answer);
  console.dir(answers);
  questionNumber++;
  showQuestion(questionNumber);
  history.pushState({ id: questionNumber }, '');
});

function getAnswerFromForm() {
  if (currentQuestionType === 'multipleChoice') {
    return answersFormEl.querySelector('input[name="answer"]:checked').value;
  } else if (currentQuestionType === 'shortAnswer') {
    return document.getElementById('short-answer').value;
  }
}

function showQuestion(i) {
  const question = questions[i];
  clearLastQuestion();
  addQuestion(question, i + 1);
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

function addQuestion(
  { question: question, type: type, choices: choices },
  questionNum
) {
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
  const choiceID = `a${uniqueId++}`;
  const newChoiceEl = document.createElement('div');
  newChoiceEl.classList.add('choice-item');
  newChoiceEl.innerHTML = `
  <label for="${choiceID}">${choice} 
    <input type="radio" name="answer" value="${choice}" id="${choiceID}">
    <span class="radio">
  </label>
  `;
  newChoiceEl.querySelector('input').addEventListener('change', () => {
    answersFormEl.dispatchEvent(new Event('submit'));
  });
  return newChoiceEl;
}
