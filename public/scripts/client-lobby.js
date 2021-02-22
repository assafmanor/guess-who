import { getCookie, deleteCookie } from './utils.js';

const MAX_NUM_QUESTIONS = 40;

const socket = io();

const playerListEl = document.getElementById('players-list');
const questionPackEl = document.getElementById('question-pack');
const questionPackListEl = document.getElementById('question-pack-list');
const numQuestionsEl = document.getElementById('num-questions');
const addPackBtn = document.getElementById('add-pack-btn');

let thisPlayer;
let isHost = false;
let isEnoughPlayers = false;
let selectedQuestionPackNames = [];
let questionPackInfo = [];
let isReconnected = false;

const guessWhoRoom = JSON.parse(getCookie('guessWhoRoom'));
const code = guessWhoRoom.code;
if (name === '') {
  name = guessWhoRoom.name;
}

function canJoinGame(id) {
  return new Promise(resolve => {
    socket.emit('isIdAvailable', { code: code, id: id });
    socket.once('isIdAvailable', data => {
      resolve(data.result);
    });
  });
}

window.addEventListener('load', async () => {
  const guessWhoRoomId = JSON.parse(getCookie('guessWhoRoomId'));
  if (code !== roomCode) return;
  if (guessWhoRoomId && guessWhoRoomId.code === code) {
    const prevId = guessWhoRoomId.id;
    const canJoin = await canJoinGame(prevId);
    if (!canJoin) {
      deleteCookie('guessWhoRoomId');
      deleteCookie('guessWhoRoomId', `/${code}`);
      deleteCookie('guessWhoRoom');
      return;
    }
    socket.emit('reconnectPlayerLobby', { code: code, id: prevId });
    isReconnected = true;
  } else {
    socket.emit('updateNewPlayer', { code: code, name: name });
  }
});

// disconnect player when they leave the lobby
window.addEventListener('beforeunload', () => {
  if (socket) {
    socket.disconnect();
  }
  return;
});

socket.on('updatePlayerList', playersData => {
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
  if (isEnoughPlayers) {
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

socket.on('updateMinimumPlayers', data => {
  console.log('updateMinimumPlayers: ' + data.result);
  isEnoughPlayers = data.result;
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
  enableStartButtonIfOKTo();
});

socket.on('getQuestionPackInfo', data => {
  console.log('getQuestionPackInfo');
  questionPackInfo = data;
  setNumQuestionsOptions();
});

socket.on('updateNewHost', hostData => {
  console.log('updateNewHost');
  isHost = true;
  enableHostOptions();
});

socket.on('numQuestionsChanged', data => {
  const numQuestions = data.value;
  console.log('numQuestions = ', numQuestions);
  numQuestionsEl.value = numQuestions;
});

socket.on('questionPacksChanged', data => {
  console.log('questionPacksChanged');
  const questionPackNames = data.value;
  updateQuestionPacksList(questionPackNames);
  selectedQuestionPackNames = questionPackNames;
  setNumQuestionsOptions();
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
  // document.getElementById('selected-question-packs').value = JSON.stringify(
  //   selectedQuestionPackNames
  // );
  // writeGameCookie();
  // event.target.submit();
});

socket.on('startRound', data => {
  console.log('startRound');
  if (!isReconnected) {
    writeGameCookie();
  }
  document.getElementById('options-form').submit();
});

function writeGameCookie() {
  // write id to cookie
  const cookieObj = { code: code, id: thisPlayer.id };
  document.cookie = 'guessWhoRoomId=' + JSON.stringify(cookieObj);
}

addPackBtn.addEventListener('click', () => {
  const selectedPackName = questionPackEl.value;
  if (selectedPackName === '') return;
  addQuestionPackToList(selectedPackName);
  socket.emit('questionPacksChanged', {
    player: thisPlayer,
    value: selectedQuestionPackNames
  });
  setNumQuestionsOptions();
  enableStartButtonIfOKTo();
});

function _areAllQuestionPackOptionsHidden() {
  return (
    Array.from(questionPackEl.options).filter(
      option =>
        !option.hasAttribute('hidden') &&
        !option.classList.contains('no-remove')
    ).length === 0
  );
}

function _setOtherOptionSelected(select) {
  for (const option of select.childNodes) {
    if (option.classList.contains('no-remove')) continue;
    if (!option.hasAttribute('hidden')) {
      option.selected = true;
    }
  }
}

function enableHostOptions() {
  document.querySelector('form fieldset').removeAttribute('disabled');
  document.getElementById('start-game-btn').style.display = 'block';
  // filter selected question packs
  const notSelectedQuestionPacks = questionPackNames.filter(
    name => !selectedQuestionPackNames.includes(name)
  );
  console.log(notSelectedQuestionPacks);
  if (notSelectedQuestionPacks.length === 0) {
    toggleQuestionPackSelection('none');
  } else {
    for (const currentOption of questionPackEl.childNodes) {
      if (notSelectedQuestionPacks.includes(currentOption.value)) {
        currentOption.removeAttribute('hidden');
      }
    }
    toggleQuestionPackSelection('block');
  }
  // add 'remove item' buttons to the selected packs list
  questionPackListEl.childNodes.forEach(li => {
    makeRemovable(li);
  });
}

async function enableStartButtonIfOKTo() {
  const startGameButton = document.getElementById('start-game-btn');
  if (checkAllFieldsAreFilled()) {
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

async function setNumQuestionsOptions() {
  console.dir(selectedQuestionPackNames);
  let numQuestions;
  if (selectedQuestionPackNames.length === 0) {
    numQuestions = 0;
  } else {
    numQuestions = getNumberOfQuestions(selectedQuestionPackNames);
  }
  removeOptionsWithValueAboveN(numQuestionsEl, numQuestions);
  addNumQuestionOptionsUntilN(
    numQuestionsEl,
    Math.min(MAX_NUM_QUESTIONS, numQuestions)
  );
}

function getNumberOfQuestions(packNames) {
  return Array.from(questionPackInfo)
    .filter(questionPack => packNames.includes(questionPack.name))
    .reduce((acc, questionPack) => {
      return acc + questionPack.numQuestions;
    }, 0);
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
    makeRemovable(li);
  }
  questionPackListEl.append(li);
  // hide option
  const selectedOption = questionPackEl.querySelector(
    `option[value="${name}"]`
  );
  selectedOption.setAttribute('hidden', '');
  // set next option (or previous if there's no next) as selected
  _setOtherOptionSelected(questionPackEl);
  // hide question pack select element if no question packs are available to choose
  if (_areAllQuestionPackOptionsHidden()) {
    toggleQuestionPackSelection('none');
  }
}

function toggleQuestionPackSelection(display) {
  questionPackEl.style.display = display;
  addPackBtn.style.display = display;
}

function makeRemovable(li) {
  // add X icon
  const removeListItemEl = document.createElement('i');
  removeListItemEl.classList.add('fas', 'fa-times', 'remove-button');
  li.appendChild(removeListItemEl);

  li.addEventListener('click', event => removeItem(event));
}

function removeItem(event) {
  const li = event.target.closest('li');
  li.parentNode.removeChild(li);
  toggleQuestionPackSelection('block');

  // unhide question pack option choice
  const questionPackName = li.textContent;
  const option = questionPackEl.querySelector(
    `option[value="${questionPackName}"]`
  );
  option.removeAttribute('hidden');
  option.selected = true;

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
}

function removeOptionsWithValueAboveN(parentSelect, n) {
  let currentOption = parentSelect.lastChild;
  while (
    currentOption &&
    +currentOption.value > n &&
    !currentOption.classList.contains('no-remove')
  ) {
    currentOption.setAttribute('hidden', '');
    currentOption = currentOption.previousSibling;
  }
}

function addNumQuestionOptionsUntilN(parentSelect, n, skip = 5) {
  let currentOption = parentSelect.firstChild;
  while (
    currentOption &&
    (currentOption.classList.contains('no-remove') || +currentOption.value <= n)
  ) {
    if (!currentOption.classList.contains('no-remove')) {
      currentOption.removeAttribute('hidden');
    }
    currentOption = currentOption.nextSibling;
  }
}
