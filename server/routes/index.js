const GuessWho = require('../app/guesswho').GuessWho;
const Lobby = require('./lobby').Lobby;

const PORT = process.env.PORT || 3000;

const INDEX = 'index';
const LOBBY = 'lobby';
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
  const js = 'scripts/client-index.js';
  const title = 'דף הבית';
  res.render(INDEX, { title: title, css: CSS, js: js });
});

app.post('/create-room', (req, res) => {
  const name = req.body.name;
  const game = guessWho.createGame();
  const gameJSON = game.getJSON();
  res.cookie('code', gameJSON.code);
  const lobby = new Lobby(game);
  lobbies.set(gameJSON.code, lobby);
  res.redirect(307, 'join-room');
});

app.post('/:code/lobby', (req, res) => {
  const title = 'לובי המתנה';
  const code = req.params.code;
  const name = req.body.name;
  if (guessWho.findGame(code) === false) {
    res.sendStatus(404);
    return;
  }
  const js = '../scripts/client-lobby.js';
  res.render(LOBBY, {
    title: title,
    css: '../' + CSS,
    name: name,
    code: code,
    js: js
  });
});

app.get('/is-code-valid/:code', (req, res) => {
  const code = req.params.code;
  if (guessWho.findGame(code) !== false) {
    res.send('true');
  } else {
    res.send('false');
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
    console.log(player.name, name);
    if (player.name === name) {
      isNameValid = 'false';
      break;
    }
  }
  console.log('isNameValid', isNameValid);
  res.send(isNameValid);
});

app.post('/join-room', (req, res) => {
  code = req.body.code;
  if (code === undefined) {
    code_cookie = req.cookies.code;
    if (code_cookie === undefined) {
      res.sendStatus(404);
      return;
    }
    code = code_cookie;
  }
  res.redirect(307, `/${code}/lobby`);
});
