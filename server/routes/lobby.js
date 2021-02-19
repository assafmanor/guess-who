const InGame = require('./ingame').InGame;

const debug = require('debug')('guesswho:lobby');

class Lobby {
  constructor(game) {
    this.game = game;
    this.io = game.io;
    this.newConnectionHandler();
  }

  newConnectionHandler() {
    this.io.on('connection', socket => {
      this.isIdAvailableHandler(socket);
      // new player handler
      socket.once('updateNewPlayer', data => {
        if (data.code !== this.game.code) return;
        debug('updateNewPlayer');
        const name = data.name;
        const newPlayer = this.game.addPlayer(name, socket);
        this.registerHandlers(socket);
        // send player info to client
        this.io.to(socket.id).emit('getPlayerInfo', newPlayer.getJSON());
        this.io.to(socket.id).emit('getGameOptions', this.game.options);
      });
      // reconnect player handler
      socket.on('reconnectPlayerLobby', data => {
        debug('reconnectPlayerLobby');
        if (data.code !== this.game.code) return;
        const player = this.game.reconnectPlayer(data.id, socket);
        this.registerHandlers(socket);
        // send player info to client
        this.io.to(socket.id).emit('getPlayerInfo', player.getJSON());
        this.io.to(socket.id).emit('getGameOptions', this.game.options);
      });
    });
  }

  isIdAvailableHandler(socket) {
    socket.on('isIdAvailable', data => {
      if (data.code !== this.game.code) return;
      const id = data.id;
      this.io
        .to(socket.id)
        .emit('isIdAvailable', { result: this.game.players.has(id) });
    });
  }

  registerHandlers(socket) {
    this.startRoundHandler(socket);
    this.optionChangedHandler(socket, 'numQuestionsChanged', 'numQuestions');
    this.optionChangedHandler(socket, 'questionPacksChanged', 'questionPacks');
  }

  disconnectedHandler() {
    this.io.on('disconnect', socket => {});
  }

  startRoundHandler(socket) {
    socket.on('startRound', data => {
      if (data.code !== this.game.code) return;
      this.game.startRound();
      this.game.ingame = new InGame(this.game);
      this.game.getPlayer(data.player.id).send('startRound');
    });
  }

  optionChangedHandler(socket, eventName, optionName) {
    socket.on(eventName, data => {
      if (data.player.roomCode !== this.game.code) return;
      this.game.options[optionName] = data.value;
      const player = this.game.getPlayer(data.player.id);
      if (player) {
        player.send(eventName, data);
      }
    });
  }
}

module.exports.Lobby = Lobby;
