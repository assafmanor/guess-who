const GuessWho = require('../app/guesswho').GuessWho;
const Lobby = require('./lobby').Lobby;

const PORT = process.env.PORT || 3000;

const INDEX = 'index';
const LOBBY = 'lobby';
const JOIN_LOBBY = 'join-lobby';
const INGAME = 'ingame';

const CSS = 'css/style.css';

const path = require('path');
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const guessWho = new GuessWho(io);
let lobbies = new Map();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

http.listen(PORT, err => {
  console.log(`listening on *:${PORT}`);
});

app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'pug');

app.use(express.static('public'));

app.get('/', (req, res) => {
  renderIndex(req, res);
});

app.post('/create-room', (req, res) => {
  const game = guessWho.createGame();
  const gameJSON = game.getJSON();
  const lobby = new Lobby(game);
  lobbies.set(gameJSON.code, lobby);
  res.redirect(307, `${gameJSON.code}`);
});

app.all('/:code([a-z]{4})', async (req, res) => {
  const code = req.params.code;
  let name = req.body.name;

  const game = guessWho.findGame(code);
  if (game === false) {
    res.sendStatus(404);
    return;
  }

  if (game.inProgress) {
    renderJoinLobby(req, res);
    return;
  }

  if (name === undefined) {
    const guessWhoRoom = req.cookies.guessWhoRoom;
    if (guessWhoRoom && guessWhoRoom.code == code) {
      name = JSON.parse(guessWhoRoom).name;
    } else {
      renderJoinLobby(req, res);
      return;
    }
  }

  if (_getPlayerList(game).includes(name)) {
    renderJoinLobby(req, res);
    return;
  }

  renderLobby(req, res);
});

function _getPlayerList(game) {
  return Array.from(game.players.values()).map(player => player.name);
}

app.all('/join-room', (req, res) => {
  let name = req.body.name;
  let code = req.body.code;
  if (name && code) {
    res.redirect(307, `/${code}`);
    return;
  }
  const guessWhoRoomStr = req.cookies.guessWhoRoom;
  if (!guessWhoRoomStr) {
    res.sendStatus(404);
    return;
  }
  guessWhoRoom = JSON.parse(guessWhoRoomStr);
  code = guessWhoRoom.code;
  name = guessWhoRoom.name;
  console.log(code, name);
  res.redirect(307, `/${code}`);
});

app.post('/:code([a-z]{4})/ingame', (req, res) => {
  const code = req.params.code;
  let name = req.body.name;

  const game = guessWho.findGame(code);
  if (game === false) {
    res.sendStatus(404);
    return;
  }

  if (!game.inProgress) {
    renderJoinLobby(req, res);
    return;
  }

  renderInGame(req, res);
});

function renderIndex(req, res) {
  const title = 'דף הבית';
  const scripts = [
    { path: 'scripts/utils.js', isModule: true },
    { path: 'scripts/client-player-join.js', isModule: true },
    { path: 'scripts/client-index.js', isModule: true }
  ];

  res.render(INDEX, { title: title, css: CSS, scripts: scripts });
}

function renderLobby(req, res) {
  const title = 'לובי המתנה';
  const code = req.params.code;
  const guessWhoRoom = req.cookies.guessWhoRoom;
  let name = req.body.name;
  let cookie;
  if (name) {
    cookie = JSON.stringify({ code: code, name: name });
  } else {
    cookie = guessWhoRoom;
  }
  res.cookie('guessWhoRoom', cookie, {
    httpOnly: false
  });

  const scripts = [
    { path: '/socket.io/socket.io.js', isModule: false },
    { path: '../scripts/utils.js', isModule: true },
    { path: '../scripts/client-lobby.js', isModule: true }
  ];

  const questionPacks = lobbies.get(code).game.questions.getPackNames();

  res.render(LOBBY, {
    title: title,
    css: '../' + CSS,
    name: name,
    code: code,
    questionPacks: questionPacks,
    scripts: scripts
  });
}

function renderJoinLobby(req, res) {
  const code = req.params.code;
  const guessWhoRoomStr = req.cookies.guessWhoRoom;
  if (guessWhoRoomStr) {
    const guessWhoRoom = JSON.parse(guessWhoRoomStr);
    const cookieCode = guessWhoRoom.code;
    const name = guessWhoRoom.name;
    const game = guessWho.findGame(code);
    if (game === false) {
      res.sendStatus(404);
      return;
    }
    if (cookieCode === code && !_getPlayerList(game).includes(name)) {
      res.redirect(`${req.baseUrl}/${code}`);
      return;
    }
  }

  const scripts = [
    { path: '../scripts/utils.js', isModule: true },
    { path: '../scripts/join-lobby.js', isModule: true },
    { path: '../scripts/client-player-join.js', isModule: true }
  ];
  const title = 'הצטרף לחדר';
  res.render(JOIN_LOBBY, {
    title: title,
    css: '../' + CSS,
    code: code,
    scripts: scripts
  });
}

function renderInGame(req, res) {
  const code = req.params.code;
  const scripts = [
    { path: '/socket.io/socket.io.js', isModule: false },
    { path: '../scripts/utils.js', isModule: true },
    { path: '../scripts/client-ingame.js', isModule: true }
  ];
  const title = 'סבב שאלות';
  res.render(INGAME, {
    title: title,
    css: '../' + CSS,
    code: code,
    scripts: scripts
  });
}

// Client API

app.get('/is-code-valid/:code', (req, res) => {
  const code = req.params.code;
  if (guessWho.findGame(code) !== false) {
    res.json({ result: true });
  } else {
    res.json({ result: false });
  }
});

app.get('/is-name-valid/:code/:name', (req, res) => {
  const code = req.params.code;
  const name = req.params.name;
  const game = guessWho.findGame(code);
  if (game === false) {
    // game should exist
    res.sendStatus(400);
    return;
  }
  let isNameValid = true;
  for (const player of game.players.values()) {
    if (player.name === name) {
      isNameValid = false;
      break;
    }
  }
  res.json({ result: isNameValid });
});

app.get('/can-join-game/:code', (req, res) => {
  const code = req.params.code;
  const game = guessWho.findGame(code);
  if (game === false) {
    res.sendStatus(404);
    return;
  }
  if (game.players.size >= game.MAX_PLAYERS) {
    res.json({ result: false, errorMessage: 'החדר מלא' });
    return;
  }
  if (game.inProgress) {
    res.json({ result: false, errorMessage: 'המשחק כבר התחיל' });
    return;
  }
  res.json({ result: true });
});

app.get('/is-enough-players/:code', (req, res) => {
  const code = req.params.code;
  const game = guessWho.findGame(code);
  if (game === false) {
    res.sendStatus(404);
    return;
  }
  if (game.players.size < game.MIN_PLAYERS) {
    res.json({ result: false });
    return;
  }
  res.send({ result: true });
});
