const debug = require('debug')('guesswho:ingame');

class InGame {
  constructor(game) {
    this.game = game;
    this.io = game.io;
    this.round = game.round;
    this.reconnectPlayersHandler();
    //this.sendQuestionsHandler();
    //this.playerDoneAnsweringHandler();
  }

  reconnectPlayersHandler() {
    this.io.on('connection', socket => {
      socket.on('reconnectPlayer', data => {
        debug('reconnectPlayer');
        if (data.code !== this.game.code) return;
        this.game.reconnectPlayer(data.id, socket);
        const player = this.game.getPlayer(data.id);
        this.round.addPlayer(player);
        this.sendQuestionsHandler(socket);
        this.playerDoneAnsweringHandler(socket);
        this.io.to(socket.id).emit('getPlayerInfo', player.getJSON());
      });
    });
  }

  sendQuestionsHandler(socket) {
    socket.on('getQuestions', data => {
      debug('getQuestions');
      if (data.code !== this.game.code) return;
      const questions = this.round.getQuestions();
      this.io.to(socket.id).emit('getQuestions', questions);
    });
  }

  playerDoneAnsweringHandler(socket) {
    socket.on('updateDoneAnswering', data => {
      debug('updateDoneAnswering');
      if (data.code !== this.game.code) return;
      this.round.answers.set(data.player.id, data.answers);
      if (this.round.isRoundOver()) {
        this.game.sendToAllPlayers('updateRoundOver');
      }
    });
  }
}

module.exports.InGame = InGame;
