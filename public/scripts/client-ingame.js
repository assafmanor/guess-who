import { getCookie, showErrorMessage } from './utils.js';

const socket = io();

const titleAreaEl = document.getElementById('title-area');

// question area elements
const questionAreaEl = document.getElementById('question-area');
const questionFormEl = document.getElementById('question-form');
const questionMultipleChoiceAreaEl = document.getElementById(
  'question-multiple-choice-area'
);
const questionShortAnswerAreaEl = document.getElementById(
  'question-short-answer-area'
);
const questionShortAnswerTextEl = document.getElementById(
  'question-short-answer'
);
const questionNumEl = document.getElementById('q-num');
const questionTextEl = document.getElementById('question-question');
const backButtonEl = document.getElementById('back-btn');
const nextButtonEl = document.getElementById('next-btn');
const submitQuestionsForm = document.getElementById('submit-questions-form');

// waiting area elements
const waitingAreaEl = document.getElementById('waiting-area');
const waitingPlayersList = document.getElementById('players-list');

// guessing area elements
const guessingAreaEl = document.getElementById('guessing-area');
const answerFormEl = document.getElementById('answer-form');
const answerAreaEl = document.getElementById('answer-area');
const answerQuestionTextEl = document.getElementById('answer-question');
const answerMultipleChoiceAreaEl = document.getElementById(
  'answer-multiple-choice-area'
);
const answerShortAnswerAreaEl = document.getElementById(
  'answer-short-answer-area'
);
const answerShortAnswerTextEl = document.getElementById('answer-short-answer');
const continueGetAnswersEl = document.getElementById(
  'continue-get-answers-btn'
);
const continueNextAnswerEl = document.getElementById(
  'continue-next-answer-btn'
);
const explanationTextEl = document.getElementById('explanation');

// results area elements
const resultsAreaEl = document.getElementById('results-area');

// game variables
const guessWhoRoomId = JSON.parse(getCookie('guessWhoRoomId'));
const code = guessWhoRoomId.code;
const id = guessWhoRoomId.id;

let thisPlayer;
let isHost = false;
let currentQuestionType;
let uniqueId = 0;

let questions;
let questionNumber = 0;
// a map from question to answer value
let playerAnswers = new Map();

// guessing section
let answersBatch;
let answerNumber = 0;
let currentPlayerAnswers;

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
  if (thisPlayer.isHost) {
    isHost = true;
    enableHostOptions();
  }
  console.dir(thisPlayer);
  socket.emit('getQuestions', { code: code, player: thisPlayer });
});

socket.on('updateNewHost', hostData => {
  console.log('updateNewHost');
  isHost = true;
  enableHostOptions();
});

socket.on('getQuestions', data => {
  questions = data;
  showQuestion(questionNumber);
  history.pushState({ id: questionNumber }, '');
});

socket.on('updateRoundOver', () => {
  console.log('updateRoundOver');
  goToGuessingArea();
});

socket.on('updateWaitingPlayersList', data => {
  console.log('updateWaitingPlayersList');
  waitingPlayersList.innerHTML = '';
  for (const player of data.players) {
    const li = document.createElement('li');
    li.textContent = player.name;
    waitingPlayersList.append(li);
  }
});

questionFormEl.addEventListener('submit', event => {
  event.preventDefault();
  const answer = getAnswerFromForm();
  if (answer === '') {
    showErrorMessage('warning', 'אנא השב/י על השאלה', 2000);
    if (playerAnswers.size === questions.length) {
      // hide and disable submit button
      submitQuestionsForm.querySelector('input').classList.add('hidden');
      submitQuestionsForm.querySelector('input').setAttribute('disabled', '');
    }
    return;
  }

  const question = questions[questionNumber];
  playerAnswers.set(question, answer);
  if (playerAnswers.size === questions.length) {
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
  console.log('answers:');
  console.dir(playerAnswers);
  socket.emit('updateDoneAnswering', {
    code: code,
    answers: JSON.stringify(Array.from(playerAnswers)),
    player: thisPlayer
  });
  goToWaitingArea();
});

function enableHostOptions() {
  continueGetAnswersEl.style.display = 'inline-block';
  continueNextAnswerEl.style.display = 'inline-block';
}

function goToWaitingArea() {
  submitQuestionsForm.style.display = 'none';
  // hide question area and show waiting area
  toggleShowElement(questionAreaEl);
  toggleShowElement(waitingAreaEl);
  titleAreaEl.innerHTML = '<h1>שלב הניחושים</h1>';
}

function goToGuessingArea() {
  toggleShowElement(waitingAreaEl);
  toggleShowElement(guessingAreaEl);
}

function getAnswerFromForm() {
  if (currentQuestionType === 'multipleChoice') {
    const checkedButton = questionFormEl.querySelector(
      'input[name="answer"]:checked'
    );
    if (checkedButton) {
      return checkedButton.value;
    }
    return '';
  } else if (currentQuestionType === 'shortAnswer') {
    return document.getElementById('question-short-answer').value;
  }
}

function showQuestion(i) {
  const question = questions[i];
  clearLastQuestion(
    questionMultipleChoiceAreaEl,
    questionShortAnswerAreaEl,
    questionShortAnswerTextEl
  );
  questionNumEl.textContent = i + 1;
  addQuestion(
    question,
    questionTextEl,
    questionMultipleChoiceAreaEl,
    questionShortAnswerAreaEl
  );
  if (playerAnswers.has(question)) {
    setAnswer(question, playerAnswers.get(question), questionFormEl);
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

function setAnswer(question, answer, form) {
  if (question.type === 'multipleChoice') {
    for (const input of form.querySelectorAll('input')) {
      if (input.value === answer) {
        input.checked = true;
      }
    }
  } else if (currentQuestionType === 'shortAnswer') {
    form.querySelector('input').value = answer;
  }
}

function clearLastQuestion(
  multipleChoiceAreaEl,
  shortAnswerAreaEl,
  shortAnswerTextEl
) {
  if (currentQuestionType === 'multipleChoice') {
    multipleChoiceAreaEl.style.display = 'none';
    multipleChoiceAreaEl.innerHTML = '';
  } else if (currentQuestionType === 'shortAnswer') {
    shortAnswerAreaEl.style.display = 'none';
    shortAnswerTextEl.value = '';
  }
}

function addQuestion(
  { question, type, choices },
  questionTextEl,
  multipleChoiceAreaEl,
  shortAnswerAreaEl
) {
  questionTextEl.textContent = question;
  currentQuestionType = type;
  if (type === 'multipleChoice') {
    multipleChoiceAreaEl.style.display = 'flex';
    addMultipleChoices(choices, multipleChoiceAreaEl);
  } else if (type === 'shortAnswer') {
    addShortAnswer(shortAnswerAreaEl);
  }
}

function addShortAnswer(shortAnswerAreaEl) {
  shortAnswerAreaEl.style.display = 'block';
}

function addMultipleChoices(choices, multipleChoiceAreaEl) {
  if (!choices) {
    choices = ['👍', '👎'];
  }
  choices.forEach(choice => {
    addChoiceElement(choice, multipleChoiceAreaEl);
  });
}

function addChoiceElement(choice, multipleChoiceAreaEl) {
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
    questionFormEl.dispatchEvent(new Event('submit'));
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

function toggleShowElement(div) {
  if (div.style.display === 'none') {
    div.style.display = 'block';
  } else {
    div.style.display = 'none';
  }
}

// ----------------------------
// ------ Guessing Area -------
// ----------------------------

function showAnswer(question, answer) {
  clearLastQuestion(
    answerMultipleChoiceAreaEl,
    answerShortAnswerAreaEl,
    answerShortAnswerTextEl
  );
  addQuestion(
    question,
    answerQuestionTextEl,
    answerMultipleChoiceAreaEl,
    answerShortAnswerAreaEl
  );
  answerFormEl.querySelector('fieldset').setAttribute('disabled', '');
  setAnswer(question, answer, answerFormEl);
}

function startBatch() {
  showAnswerArea();
  continueNextAnswerEl.value = 'תשובה הבאה';
  socket.emit('showNextAnswer', { code: code });
}

socket.on('getAnswersBatch', data => {
  console.log('getAnswersBatch');
  if (data.success) {
    currentPlayerAnswers = data.result.playerId;
    answersBatch = JSON.parse(data.result.answers);
    answerNumber = 0;
  } else {
    // guessing over
    goToResultsArea();
  }
});

socket.on('showNextAnswer', () => {
  const [question, answer] = answersBatch[answerNumber++];
  showAnswer(question, answer);
});

continueNextAnswerEl.addEventListener('click', () => {
  if (!isHost) return;
  if (answerNumber === answersBatch.length) {
    // get the next batch ready
    socket.emit('getAnswersBatch', { code: code });
    socket.emit('batchOver', { code: code });
    return;
  }
  if (answerNumber === answersBatch.length - 1) {
    continueNextAnswerEl.value = 'סיום';
  }
  console.log('answerNumber: ' + answerNumber);
  socket.emit('showNextAnswer', { code: code });
});

continueGetAnswersEl.addEventListener('click', () => {
  if (!isHost) return;
  if (!answersBatch) {
    socket.emit('getAnswersBatch', { code: code });
  }
  socket.emit('startBatch', { code: code });
});

socket.on('startBatch', () => {
  startBatch();
});

socket.on('batchOver', () => {
  hideAnswerArea();
});

function showAnswerArea() {
  answerAreaEl.style.display = 'block';
  explanationTextEl.style.display = 'none';
}

function hideAnswerArea() {
  answerAreaEl.style.display = 'none';
  explanationTextEl.style.display = 'block';
}

// ---------------------------
// ------ Results Area -------
// ---------------------------

function goToResultsArea() {
  toggleShowElement(guessingAreaEl);
  toggleShowElement(resultsAreaEl);
}
