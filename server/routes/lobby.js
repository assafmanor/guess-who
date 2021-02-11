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
      socket.on('updateNewPlayer', data => {
        if (data.code !== this.game.code) return;
        debug('updateNewPlayer');
        const name = data.name;
        const newPlayer = this.game.addPlayer(name, socket);
        this.startRoundHandler(socket);
        this.optionChangedHandler(
          socket,
          'numQuestionsChanged',
          'numQuestions'
        );
        this.optionChangedHandler(
          socket,
          'questionPacksChanged',
          'questionPacks'
        );
        this.io.to(socket.id).emit('getPlayerInfo', newPlayer.getJSON());
        this.io.to(socket.id).emit('getGameOptions', this.game.options);
      });
    });
  }

  disconnectedHandler() {
    this.io.on('disconnect', socket => {});
  }

  startRoundHandler(socket) {
    socket.on('startRound', data => {
      if (data.code !== this.game.code) return;
      this.game.startRound();
      new InGame(this.game);
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
