import { getCookie } from './utils.js';

const MAX_NUM_QUESTIONS = 40;

const socket = io();

const playerListEl = document.getElementById('players-list');
const questionPackEl = document.getElementById('question-pack');
const questionPackListEl = document.getElementById('question-pack-list');
const numQuestionsEl = document.getElementById('num-questions');
const addPackBtn = document.getElementById('add-pack-btn');

let thisPlayer;
let isHost = false;
let selectedQuestionPackNames = [];

const guessWhoRoom = JSON.parse(getCookie('guessWhoRoom'));
const code = guessWhoRoom.code;
if (name === '') {
  name = guessWhoRoom.name;
}
socket.emit('updateNewPlayer', { code: code, name: name });

socket.on('updatePlayerList', async playersData => {
  console.log('updatePlayerList');
  playerListEl.innerHTML = '';
  for (const player of playersData.players) {
    const li = document.createElement('li');
    li.textContent = player.name;
    if (player.isHost) {
      li.textContent += '👑';
    }
    playerListEl.append(li);
  }
  const isEnoughPlayer = await checkMinimumNumberOfPlayers();
  if (isEnoughPlayer) {
    document.getElementById('players-wait').style.display = 'none';
  } else {
    document.getElementById('players-wait').style.display = 'block';
  }
  enableStartButtonIfOKTo();
});

socket.on('getPlayerInfo', playerJSON => {
  console.log('getPlayerInfo');
  thisPlayer = playerJSON;
});

socket.on('getGameOptions', data => {
  const questionPacks = data.questionPacks;
  const numQuestions = data.numQuestions;
  console.log('getGameOptions');
  if (questionPacks) {
    updateQuestionPacksList(questionPacks);
  }
  if (numQuestions) {
    numQuestionsEl.value = numQuestions;
  }
});

socket.on('updateNewHost', hostData => {
  console.log('updateNewHost');
  const hostSocketId = hostData.socketId;
  if (socket.id === hostSocketId) {
    enableHostOptions();
  }
});

socket.on('numQuestionsChanged', data => {
  const numQuestions = data.value;
  numQuestionsEl.value = numQuestions;
});

socket.on('questionPacksChanged', data => {
  console.log('questionPacksChanged');
  const questionPackNames = data.value;
  updateQuestionPacksList(questionPackNames);
  selectedQuestionPackNames = questionPackNames;
});

socket.on('startRound', () => {
  console.log('startRound');
});

numQuestionsEl.addEventListener('change', () => {
  socket.emit('numQuestionsChanged', {
    player: thisPlayer,
    value: numQuestionsEl.value
  });
  enableStartButtonIfOKTo();
});

questionPackEl.addEventListener('change', () => {
  if (questionPackEl.selectedIndex.value !== '') {
    addPackBtn.disabled = false;
  } else {
    addPackBtn.disabled = true;
  }
});

document.getElementById('options-form').addEventListener('submit', event => {
  event.preventDefault();
  socket.emit('startRound', {
    player: thisPlayer,
    code: code
  });
  document.getElementById('selected-question-packs').value = JSON.stringify(
    selectedQuestionPackNames
  );
  event.target.submit();
});

socket.on('startRound', data => {
  // write id to cookie
  const cookieObj = { code: code, id: thisPlayer.id };
  document.cookie = 'guessWhoRoomId=' + JSON.stringify(cookieObj);
  document.getElementById('options-form').submit();
});

addPackBtn.addEventListener('click', () => {
  const selectedPackName = questionPackEl.value;
  if (selectedPackName === '') return;
  addQuestionPackToList(selectedPackName);
  questionPackEl.remove(questionPackEl.selectedIndex);
  if (questionPackEl.options.length == 1) {
    // only 'בחר'
    toggleQuestionPackSelection('none');
  }
  socket.emit('questionPacksChanged', {
    player: thisPlayer,
    value: selectedQuestionPackNames
  });
  setNumQuestionsOptions();
  enableStartButtonIfOKTo();
});

function enableHostOptions() {
  isHost = true;
  document.querySelector('form fieldset').removeAttribute('disabled');
  document.getElementById('start-game-btn').style.display = 'block';
  // update question pack selection menu
  while (questionPackEl.childNodes.length > 1) {
    questionPackEl.removeChild(questionPackEl.lastChild);
  }
  const filter = questionPackNames.filter(
    name => !selectedQuestionPackNames.includes(name)
  );
  if (filter.length === 0) {
    toggleQuestionPackSelection('none');
  } else {
    filter.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      questionPackEl.append(option);
    });
    toggleQuestionPackSelection('block');
  }
  // update num questions
  setNumQuestionsOptions();
  // add 'remove item' buttons to the selected packs list
  questionPackListEl.childNodes.forEach(li => {
    li.appendChild(createRemoveItemButtonEl());
  });
}

async function enableStartButtonIfOKTo() {
  const startGameButton = document.getElementById('start-game-btn');
  if (checkAllFieldsAreFilled()) {
    const isEnoughPlayers = await checkMinimumNumberOfPlayers();
    if (isEnoughPlayers) {
      startGameButton.removeAttribute('disabled');
    } else {
      startGameButton.setAttribute('disabled', '');
    }
  } else {
    startGameButton.setAttribute('disabled', '');
  }
}

function checkAllFieldsAreFilled() {
  if (selectedQuestionPackNames.length === 0) {
    return false;
  }
  if (numQuestionsEl.value === '') {
    return false;
  }
  return true;
}

async function checkMinimumNumberOfPlayers() {
  return await fetch(`/is-enough-players/${code}`)
    .then(res => res.json())
    .then(res => {
      return res.result;
    });
}

async function setNumQuestionsOptions() {
  let numAllowedQuestions;
  if (selectedQuestionPackNames.length === 0) {
    numAllowedQuestions = 0;
  } else {
    const origin = window.location.origin;
    const url = new URL(origin + '/num-of-allowed-questions/');
    const params = { questionPacks: selectedQuestionPackNames };
    url.search = new URLSearchParams(params).toString();
    numAllowedQuestions = await fetch(url)
      .then(res => res.json())
      .then(res => {
        return res.result;
      });
  }
  removeOptionsWithValueAboveN(numQuestionsEl, numAllowedQuestions);
  addNumQuestionOptionsUntilN(
    numQuestionsEl,
    Math.min(MAX_NUM_QUESTIONS, numAllowedQuestions)
  );
}

function updateQuestionPacksList(questionPackNames) {
  questionPackListEl.innerHTML = '';
  for (const questionPackName of questionPackNames) {
    addQuestionPackToList(questionPackName);
  }
}

function addQuestionPackToList(name) {
  selectedQuestionPackNames.push(name);
  const li = document.createElement('li');
  li.textContent = name;
  li.classList.add('text-sml');
  if (isHost) {
    li.append(createRemoveItemButtonEl());
  }
  questionPackListEl.append(li);
}

function toggleQuestionPackSelection(display) {
  questionPackEl.style.display = display;
  addPackBtn.style.display = display;
}

function createRemoveItemButtonEl() {
  const removeListItemEl = document.createElement('i');
  removeListItemEl.classList.add('fas', 'fa-times', 'remove-button');
  removeListItemEl.addEventListener('click', event => {
    const li = event.target.parentNode;
    li.parentNode.removeChild(li);
    if (questionPackEl.childNodes.length === 1) {
      toggleQuestionPackSelection('block');
    }
    const option = document.createElement('option');
    const questionPackName = li.textContent;
    option.value = questionPackName;
    option.textContent = questionPackName;
    questionPackEl.appendChild(option);

    const index = selectedQuestionPackNames.indexOf(questionPackName);
    if (index > -1) {
      selectedQuestionPackNames.splice(index, 1);
    }
    setNumQuestionsOptions();

    enableStartButtonIfOKTo();
    socket.emit('questionPacksChanged', {
      player: thisPlayer,
      value: selectedQuestionPackNames
    });
  });
  return removeListItemEl;
}

function removeOptionsWithValueAboveN(parentSelect, n) {
  let currentOption = parentSelect.lastChild;
  while (
    +currentOption.value > n &&
    !currentOption.classList.contains('no-remove')
  ) {
    parentSelect.removeChild(currentOption);
    currentOption = parentSelect.lastChild;
  }
}

function addNumQuestionOptionsUntilN(parentSelect, n, skip = 5) {
  let currentOption = parentSelect.lastChild;
  let startingVal =
    currentOption.value % 5 === 0 ? +currentOption.value + 5 : 5;
  for (let i = startingVal; i <= n; i += skip) {
    addNumQuestionsOption(parentSelect, i);
  }
}

function addNumQuestionsOption(parentSelect, value) {
  const optionEl = document.createElement('option');
  optionEl.value = value;
  optionEl.textContent = value;
  parentSelect.appendChild(optionEl);
}
