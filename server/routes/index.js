const GuessWho = require('../app/guesswho').GuessWho;
const Lobby = require('./lobby').Lobby;

const debug = require('debug')('guesswho:index');

const INDEX = 'index';
const LOBBY = 'lobby';
const JOIN_LOBBY = 'join-lobby';
const INGAME = 'ingame';
const ERROR = 'error';

const CSS = 'css/style.css';

const devMode = process.env.NODE_ENV === 'development';
debug('dev mode: ' + devMode);
let io;
let guessWho;

function router(app) {
  io = app.io;
  guessWho = new GuessWho(io, devMode);

  app.get('/', (req, res) => {
    renderIndex(req, res);
  });

  app.post('/create-room', (req, res) => {
    const game = guessWho.createGame();
    const gameJSON = game.getJSON();
    const lobby = new Lobby(game);
    guessWho.lobbies.set(gameJSON.code, lobby);
    res.redirect(307, `${gameJSON.code}`);
  });

  app.all('/:code([a-z]{4})', (req, res, next) => {
    const code = req.params.code;
    let name = req.body.name;

    const game = guessWho.findGame(code);
    if (!game) {
      sendError(next, 'המשחק לא קיים');
      return;
    }

    if (name === undefined) {
      const guessWhoRoom = req.cookies.guessWhoRoom;
      if (guessWhoRoom && JSON.parse(guessWhoRoom).code === code) {
        name = JSON.parse(guessWhoRoom).name;
      } else {
        renderJoinLobby(req, res, next);
        return;
      }
    }

    renderLobby(req, res);
  });

  app.all('/join-room', (req, res) => {
    let name = req.body.name;
    let code = req.body.code;
    if (name && code) {
      res.redirect(307, `/${code}`);
      return;
    }
    const guessWhoRoomStr = req.cookies.guessWhoRoom;
    if (!guessWhoRoomStr) {
      sendError(next, 'לא הצלחנו לצרף אותך');
      return;
    }
    guessWhoRoom = JSON.parse(guessWhoRoomStr);
    code = guessWhoRoom.code;
    name = guessWhoRoom.name;
    res.redirect(307, `/${code}`);
  });

  app.post('/:code([a-z]{4})/ingame', (req, res, next) => {
    const code = req.params.code;

    const game = guessWho.findGame(code);
    if (!game) {
      sendError(next, 'המשחק לא קיים');
    } else if (!game.inProgress) {
      renderJoinLobby(req, res, next);
    } else {
      renderInGame(req, res);
    }
  });

  // dev mode routes
  if (devMode) {
    app.get('/dev', (req, res) => {
      // create room
      const game = guessWho.createGame();
      const gameJSON = game.getJSON();
      const lobby = new Lobby(game);
      const code = gameJSON.code;
      guessWho.lobbies.set(code, lobby);

      const cookie = { code: code, name: 'מפתח' };
      res.cookie('guessWhoRoom', JSON.stringify(cookie), {
        httpOnly: false
      });
      res.redirect(`/${code}`);
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

  app.get('/is-name-valid/:code/:name', (req, res, next) => {
    const code = req.params.code;
    const name = req.params.name;
    const game = guessWho.findGame(code);
    if (!game) {
      res.json({ result: false });
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

  app.get('/can-join-game/:code', (req, res, next) => {
    const code = req.params.code;
    const game = guessWho.findGame(code);
    if (!game) {
      res.json({ result: false, errorMessage: 'המשחק לא קיים' });
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

  // error handling

  function sendError(next, message) {
    var err = new Error(message);
    err.status = 404;
    next(err);
  }

  app.use((req, res, next) => {
    if (res.headersSent) {
      return next(err);
    }
    sendError(next, 'העמוד לא נמצא');
  });

  if (devMode) {
    app.use((err, req, res, next) => {
      res.status(err.status || 500);
      res.render(ERROR, {
        title: err.message,
        css: '../' + CSS,
        error: err,
        stack: err.stack
      });
      next();
    });
  }

  app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.render(ERROR, {
      title: err.message,
      css: '../' + CSS,
      error: err
    });
    next();
  });
}

function _getPlayerList(game) {
  return Array.from(game.players.values()).map(player => player.name);
}

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

  const questionPacks = guessWho.getQuestionPacks().sort();

  res.render(LOBBY, {
    title: title,
    css: '../' + CSS,
    name: name,
    code: code,
    questionPacks: questionPacks,
    devMode: devMode,
    scripts: scripts
  });
}

function renderJoinLobby(req, res, next) {
  const code = req.params.code;
  const guessWhoRoomStr = req.cookies.guessWhoRoom;
  if (guessWhoRoomStr) {
    const guessWhoRoom = JSON.parse(guessWhoRoomStr);
    const cookieCode = guessWhoRoom.code;
    const name = guessWhoRoom.name;
    const game = guessWho.findGame(code);
    if (!game) {
      sendError(next, 'המשחק לא קיים');
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
    { path: '../scripts/Chart.min.js', isModule: false },
    { path: '../scripts/utils.js', isModule: true },
    { path: '../scripts/client-ingame.js', isModule: true }
  ];
  const title = 'סבב שאלות';
  res.render(INGAME, {
    title: title,
    css: '../' + CSS,
    code: code,
    NUM_ANSWERS_EACH_TIME: process.env.NUM_ANSWERS_EACH_TIME,
    scripts: scripts
  });
}

module.exports.router = router;
