const GuessWho = require('../app/guesswho').GuessWho;
const Lobby = require('./lobby').Lobby;

const PORT = process.env.PORT || 3000;

const INDEX = 'index';
const LOBBY = 'lobby';
const JOIN_LOBBY = 'join-lobby';

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
  // const js = 'scripts/client-index.js';
  const title = 'דף הבית';
  const scripts = [
    { path: 'scripts/utils.js', isModule: true },
    { path: 'scripts/client-player-join.js', isModule: true },
    { path: 'scripts/client-index.js', isModule: true }
  ];

  res.render(INDEX, { title: title, css: CSS, scripts: scripts });
});

app.post('/create-room', (req, res) => {
  const game = guessWho.createGame();
  const gameJSON = game.getJSON();
  const lobby = new Lobby(game);
  lobbies.set(gameJSON.code, lobby);
  res.redirect(307, `${gameJSON.code}/lobby`);
});

app.all('/:code([a-z]{4})/?(lobby)', (req, res) => {
  const title = 'לובי המתנה';
  const code = req.params.code;
  let name = req.body.name;
  if (name === undefined) {
    const guessWhoRoom = req.cookies.guessWhoRoom;
    if (guessWhoRoom) {
      name = JSON.parse(guessWhoRoom).name;
    } else {
      res.redirect(`${req.baseUrl}/${code}/join`);
      return;
    }
  }
  const game = guessWho.findGame(code);
  if (game === false) {
    res.sendStatus(404);
    return;
  }
  // find out if player has already joined
  game.players.forEach(player => {
    if (player.name === name) {
      res.redirect(`${req.baseUrl}/${code}/join`);
      return;
    }
  });
  const cookie = { code: code, name: name };
  res.cookie('guessWhoRoom', JSON.stringify(cookie), {
    maxAge: 600000 /* 10 minutes */,
    httpOnly: false
  });
  const scripts = [
    { path: '/socket.io/socket.io.js', isModule: false },
    { path: '../scripts/utils.js', isModule: true },
    { path: '../scripts/client-lobby.js', isModule: true }
  ];
  res.render(LOBBY, {
    title: title,
    css: '../' + CSS,
    name: name,
    code: code,
    scripts: scripts
  });
});

app.post('/join-room', (req, res) => {
  const code = req.body.code;
  const name = req.body.name;
  if (code === undefined) {
    const guessWhoRoom = req.cookies.guessWhoRoom;
    if (guessWhoRoom && guessWhoRoom.code) {
      code = guessWhoRoom.code;
    } else {
      res.sendStatus(404);
      return;
    }
  }
  res.redirect(307, `/${code}/lobby`);
});

app.get('/:code/join', (req, res) => {
  const code = req.params.code;
  const guessWhoRoom = req.cookies.guessWhoRoom;
  if (guessWhoRoom && guessWhoRoom.code === code) {
    res.redirect(`${req.baseUrl}/${code}/lobby`);
  }
  if (guessWho.findGame(code) === false) {
    res.sendStatus(404);
    return;
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
});

// Client API

app.get('/is-code-valid/:code', (req, res) => {
  const code = req.params.code;
  if (guessWho.findGame(code) !== false) {
    res.send('true');
    console.log('true');
  } else {
    res.send('false');
    console.log('false');
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
  let isNameValid = 'true';
  for (const player of game.players.values()) {
    if (player.name === name) {
      isNameValid = 'false';
      break;
    }
  }
  res.send(isNameValid);
});

app.get('/can-join-game/:code', (req, res) => {
  const code = req.params.code;
  const game = guessWho.findGame(code);
  if (game === false) {
    res.sendStatus(404);
    return;
  }
  if (game.players.size >= game.MAX_PLAYERS) {
    res.send('false');
    return;
  }
  res.send('true');
});

app.get('/is-enough-players/:code', (req, res) => {
  const code = req.params.code;
  const game = guessWho.findGame(code);
  if (game === false) {
    res.sendStatus(404);
    return;
  }
  if (game.players.size < game.MIN_PLAYERS) {
    res.send('false');
    return;
  }
  res.send('true');
});
