import { getCookie } from './utils.js';

const socket = io();

const playerListEl = document.getElementById('players-list');
const questionPackEl = document.getElementById('question-pack');
const numQuestionsEl = document.getElementById('num-questions');

let thisPlayer;

const guessWhoRoom = JSON.parse(getCookie('guessWhoRoom'));
const code = guessWhoRoom.code;
const name = guessWhoRoom.name;

socket.emit('updateNewPlayer', { code: code, name: name });

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
  enableStartButtonIfOKTo();
});

socket.on('getPlayerInfo', playerJSON => {
  console.log('getPlayerInfo');
  thisPlayer = playerJSON;
});

socket.on('getGameOptions', data => {
  const questionPack = data.questionPack;
  const numQuestions = data.numQuestions;
  console.log('getGameOptions');
  console.dir(data);
  questionPackEl.value = questionPack;
  numQuestionsEl.value = numQuestions;
});

socket.on('updateNewHost', hostData => {
  console.log('updateNewHost');
  const hostSocketId = hostData.socketId;
  const nonHostArea = document.getElementById('non-host-area');
  if (socket.id === hostSocketId) {
    enableHostOptions();
  }
});

socket.on('numQuestionsChanged', data => {
  const numQuestions = data.value;
  numQuestionsEl.value = numQuestions;
});
socket.on('questionPackChanged', data => {
  const questionPack = data.value;
  questionPackEl.value = questionPack;
});

function enableHostOptions() {
  document.querySelector('form fieldset').removeAttribute('disabled');
  document.getElementById('start-game-btn').style.display = 'block';
}

numQuestionsEl.addEventListener('change', () => {
  socket.emit('numQuestionsChanged', {
    player: thisPlayer,
    value: numQuestionsEl.value
  });
  enableStartButtonIfOKTo();
});

questionPackEl.addEventListener('change', () => {
  socket.emit('questionPackChanged', {
    player: thisPlayer,
    value: questionPackEl.value
  });
  enableStartButtonIfOKTo();
});

async function enableStartButtonIfOKTo() {
  const startGameButton = document.getElementById('start-game-btn');
  if (checkAllFieldsAreFilled()) {
    checkMinimumNumberOfPlayers().then(res => {
      if (res) {
        startGameButton.removeAttribute('disabled');
      } else {
        startGameButton.setAttribute('disabled', '');
      }
    });
  } else {
    startGameButton.setAttribute('disabled', '');
  }
}

function checkAllFieldsAreFilled() {
  const formFields = document.querySelectorAll('.form-group select');
  for (let i = 0; i < formFields.length; i++) {
    if (formFields[i].value === '') {
      return false;
    }
  }
  return true;
}

async function checkMinimumNumberOfPlayers() {
  return await fetch(`/is-enough-players/${code}`)
    .then(res => res.json())
    .then(res => {
      return res;
    });
}
