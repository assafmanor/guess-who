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
const votingArea = document.getElementById('voting-area');
const answerShortAnswerTextEl = document.getElementById('answer-short-answer');
const continueGetAnswersEl = document.getElementById(
  'continue-get-answers-btn'
);
const continueNextAnswerEl = document.getElementById(
  'continue-next-answer-btn'
);
const explanationTextEl = document.getElementById('explanation');
let voteChart;
const voteButtonsDiv = document.getElementById('vote-buttons');
const answerNumberEl = document.getElementById('answer-num');
const yourAnswersIndicatorEl = document.getElementById(
  'your-answers-indicator'
);

// results area elements
const resultsAreaEl = document.getElementById('results-area');
const resultsTitleEl = document.getElementById('results-title');
const resultsCorrectPlayerEl = document.getElementById(
  'results-correct-player'
);
const resultsSubTitleEl = document.getElementById('results-sub-title');
const resultsPlayerLeaderboard = document.getElementById('player-leaderboard');
const resultsCorrectPlayerAreaEl = document.getElementById(
  'results-correct-player-area'
);
const resultsWinnerArea = document.getElementById('results-winner-area');
const winnerEl = document.getElementById('winner');

// return to lobby area
const returnToLobbyAreaEl = document.getElementById('return-to-lobby-area');
const returnToLobbyFormEl = document.getElementById('return-to-lobby-form');

// game variables
const guessWhoRoomId = JSON.parse(getCookie('guessWhoRoomId'));
const code = guessWhoRoomId.code;
const id = guessWhoRoomId.id;
let isGameOver = false;

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

let playerBatchInfo;
let playerList;

// The length of time (in ms) it shows the leaderboard
// between each round of answers
const RESULTS_SHOW_TIME = 10000;

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

window.addEventListener('load', () => {
  socket.emit('reconnectPlayerIngame', { code: code, id: id });
});

window.addEventListener('beforeunload', event => {
  const confirmationMessage = 'אתה בטוח שאתה רוצה לעזוב את המשחק?';
  (event || window.event).returnValue = confirmationMessage;
  return confirmationMessage;
});

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
  initVotingSystem();
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
  returnToLobbyFormEl.querySelector('input').classList.remove('hidden');
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

(function chartConfig() {
  Chart.defaults.global.defaultFontFamily = "'Varela Round', sans-serif";
  Chart.defaults.global.defaultFontSize = 20;
  Chart.defaults.global.defaultFontColor = '#000';
  Chart.defaults.global.legend.display = false;
  Chart.defaults.global.tooltips.enabled = false;
})();

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
  // disable form so that the answer couldn't be changed
  answerFormEl.querySelector('fieldset').setAttribute('disabled', '');
  // set question number
  answerNumberEl.textContent = answerNumber;
  setAnswer(question, answer, answerFormEl);
}

function startBatch() {
  showAnswerArea();
  playerBatchInfo = {
    voted: false
  };
  startNewVote();
  answerNumber = 0;
  continueNextAnswerEl.value = 'תשובה הבאה';
}

socket.on('getAnswersBatch', data => {
  console.log('getAnswersBatch');
  if (data.success) {
    currentPlayerAnswers = data.result.player;
    answersBatch = JSON.parse(data.result.answers);
  } else {
    // guessing over
    isGameOver = true;
    updateResultsArea();
    setTimeout(() => {
      showRoundResults();
    }, RESULTS_SHOW_TIME);
  }
});

socket.on('showNextAnswer', () => {
  console.log('showNextAnswer');
  const [question, answer] = answersBatch[answerNumber++];
  showAnswer(question, answer);
});

continueNextAnswerEl.addEventListener('click', () => {
  if (!isHost) return;
  if (answerNumber >= answersBatch.length) {
    socket.emit('batchOver', { code: code });
    // get the next batch ready
    socket.emit('getAnswersBatch', { code: code });
    return;
  }
  if (answerNumber === answersBatch.length - 1) {
    continueNextAnswerEl.value = 'סיום';
  }
  socket.emit('showNextAnswer', { code: code });
});

continueGetAnswersEl.addEventListener('click', () => {
  if (!isHost) return;
  if (!answersBatch) {
    socket.emit('getAnswersBatch', { code: code });
  }
  socket.emit('startBatch', { code: code });
  socket.emit('showNextAnswer', { code: code });
});

socket.on('startBatch', () => {
  startBatch();
});

socket.on('batchOver', () => {
  hideAnswerArea();
  toggleShowResultsArea();
  updateResultsArea();

  setTimeout(() => {
    if (!isGameOver) {
      toggleShowResultsArea();
    }
  }, RESULTS_SHOW_TIME);
});

function showAnswerArea() {
  answerAreaEl.style.display = 'block';
  explanationTextEl.style.display = 'none';
  votingArea.style.display = 'block';
  if (currentPlayerAnswers.id === thisPlayer.id) {
    yourAnswersIndicatorEl.style.display = 'block';
  }
}

function hideAnswerArea() {
  answerAreaEl.style.display = 'none';
  explanationTextEl.style.display = 'block';
  yourAnswersIndicatorEl.style.display = 'none';
  votingArea.style.display = 'none';
}

// Voting System

const COLORS_ARRAY = [
  '8d9fe2',
  '70b3ff',
  '6cc66f',
  'ecd557',
  'f98f24',
  'ff5f5c',
  'fa7596',
  'cd9bc8'
];

function castVote(id, name) {
  if (playerBatchInfo.voted) return;
  playerBatchInfo.voted = true;
  // disable voting buttons
  const voteButtons = document
    .getElementById('vote-buttons')
    .querySelectorAll('button');
  Array.from(voteButtons).forEach(button => {
    button.disabled = true;
  });
  socket.emit('makeVote', {
    code: code,
    player: thisPlayer,
    choice: { id, name },
    // isCorrect: isCorrect,
    answerNumber: answerNumber
  });
}

socket.on('updatePoll', data => {
  console.log('updatePoll');
  const choice = data.choice;
  // update chart
  voteChart.data.datasets.forEach(dataset => {
    if (dataset.label === choice.name) {
      dataset.data[0] += 1;
    }
  });
  voteChart.update();
  // update score
  const pollScoreEl = document.getElementById(`poll-score-${choice.id}`);
  if (pollScoreEl) {
    const newScore = +pollScoreEl.textContent + 1;
    pollScoreEl.textContent = newScore;
  }
});

function getPlayerList() {
  return new Promise(resolve => {
    socket.emit('getPlayerList', { code: code });
    socket.once('getPlayerList', data => {
      resolve(data.players);
    });
  });
}

async function initVotingSystem() {
  playerList = await getPlayerList();
  initChart(playerList);
  initPollOptions(playerList);
}

function initPollOptions(playerList) {
  let colorIterator = COLORS_ARRAY.values();
  playerList.forEach(({ id, name }) => {
    const voteButton = document.createElement('button');
    voteButton.className = 'btn vote-btn';
    voteButton.value = id;
    voteButton.textContent = name;
    voteButton.style.backgroundColor = `#${colorIterator.next().value}`;
    voteButton.addEventListener('click', event => {
      event.preventDefault();
      event.target.classList.add('voted');
      castVote(id, name);
    });
    const voteButtonItem = document.createElement('div');
    voteButtonItem.classList.add('poll-item');
    const pollScoreEl = document.createElement('p');
    pollScoreEl.classList.add('poll-score');
    pollScoreEl.id = `poll-score-${id}`;
    pollScoreEl.textContent = '0';
    voteButtonItem.appendChild(voteButton);
    voteButtonItem.appendChild(pollScoreEl);
    voteButtonsDiv.appendChild(voteButtonItem);
  });
}

function resetPollOptions(playerList) {
  voteButtonsDiv.querySelectorAll('button').forEach(button => {
    button.classList.remove('voted');
    if (currentPlayerAnswers.id === thisPlayer.id) {
      // the player whose answers are shown cannot vote
      button.disabled = true;
    } else if (+button.value === thisPlayer.id) {
      // players can't vote for themselves
      button.disabled = true;
    } else {
      button.disabled = false;
    }
    voteButtonsDiv.querySelectorAll('.poll-score').forEach(pollScoreEl => {
      pollScoreEl.textContent = '0';
    });
  });
}

function startNewVote() {
  resetPollOptions(playerList);
  voteChart.data.datasets.forEach(dataset => {
    dataset.data[0] = 0;
  });
  voteChart.update();
}

function initChart(playerList) {
  let datasets = [];
  let colorIterator = COLORS_ARRAY.values();

  playerList.forEach(({ name }) => {
    datasets.push({
      maxBarThickness: 70,
      label: name,
      data: [0],
      backgroundColor: [`#${colorIterator.next().value}`],
      borderColor: ['gray'],
      borderWidth: 1
    });
  });

  const chartEl = document.getElementById('voting-chart');
  voteChart = new Chart(chartEl, {
    type: 'bar',
    data: {
      datasets: datasets.reverse()
    },
    options: {
      title: {
        display: true,
        text: ['תוצאות הצבעה']
      },
      tooltips: {
        enabled: false
      },
      maintainAspectRatio: false,
      scales: {
        yAxes: [
          {
            ticks: {
              display: true,
              beginAtZero: true,
              stepSize: 1,
              max: playerList.length - 1
            }
          }
        ]
      }
    }
  });
}

// ---------------------------
// ------ Results Area -------
// ---------------------------

function toggleShowResultsArea() {
  toggleShowElement(guessingAreaEl);
  toggleShowElement(resultsAreaEl);
}

function updateResultsArea(gameOver = false) {
  console.log('updateResultsArea');
  if (gameOver) {
    titleAreaEl.innerHTML = '<h1>המשחק נגמר</h1>';
    resultsTitleEl.style.display = 'none';
    resultsCorrectPlayerAreaEl.style.display = 'none';
    resultsWinnerArea.style.display = 'block';
    resultsSubTitleEl.textContent = 'ניקוד סופי';
  }
  updateCorrectPlayerReveal();
  updateLeaderboard(gameOver);
}

function updateCorrectPlayerReveal() {
  console.log('updateCorrectPlayerReveal');
  resultsCorrectPlayerEl.textContent = currentPlayerAnswers.name;
}

function updateWinners(leaderboard) {
  console.log('updateWinners');
  console.dir(leaderboard);
  const highestScore = Math.max(...leaderboard.map(player => player.score));
  const winners = leaderboard
    .filter(player => player.score === highestScore)
    .map(player => player.name);
  winnerEl.textContent = winners.join(', ');
}

function getScores() {
  return new Promise(resolve => {
    socket.emit('getScores', { code: code });
    socket.once('getScores', data => {
      resolve(data.scores);
    });
  });
}

async function updateLeaderboard(gameOver = false) {
  console.log('updateLeaderboard');
  const scores = await getScores();
  resultsPlayerLeaderboard.innerHTML = '';
  // create rows reflecting the scores
  scores.forEach(({ name, score, addedPoints }) => {
    const rowEl = document.createElement('div');
    rowEl.classList.add('lb-row');
    const nameEl = document.createElement('div');
    nameEl.classList.add('lb-name');
    nameEl.textContent = name;
    const scoreEl = document.createElement('div');
    scoreEl.classList.add('lb-score');
    rowEl.appendChild(nameEl);
    rowEl.appendChild(scoreEl);
    const addedPointsStr =
      !gameOver && addedPoints
        ? ` (${Math.abs(addedPoints)}${addedPoints > 0 ? '+' : '-'})`
        : '';
    const totalPointsStr = `${Math.abs(score)}${score < 0 ? '-' : ''}`;
    scoreEl.textContent = `${totalPointsStr}${addedPointsStr}`;
    resultsPlayerLeaderboard.appendChild(rowEl);
  });
  if (gameOver) {
    updateWinners(scores);
  }
}

function showRoundResults() {
  updateResultsArea(true);
  returnToLobbyAreaEl.style.display = 'block';
}

returnToLobbyFormEl.querySelector('input').addEventListener('click', event => {
  event.preventDefault();
  socket.emit('returnToLobby', { code: code });
});

socket.on('returnToLobby', () => {
  returnToLobbyFormEl.submit();
});
