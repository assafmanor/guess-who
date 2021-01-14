class InGame {
  constructor(game) {
    this.game = game;
    this.io = game.io;
    this.reconnectPlayersHandler();
    this.sendQuestionsHandler();
  }

  reconnectPlayersHandler() {
    this.io.on('connection', socket => {
      socket.on('reconnectPlayer', data => {
        console.log('reconnectPlayer');
        if (data.code !== this.game.code) return;
        this.game.reconnectPlayer(data.id, socket);
        const player = this.game.getPlayer(data.id);
        this.io.to(socket.id).emit('getPlayerInfo', player.getJSON());
      });
    });
  }

  sendQuestionsHandler() {
    this.io.on('connection', socket => {
      socket.on('getQuestions', data => {
        console.log('getQuestions');
        if (data.code !== this.game.code) return;
        const questions = this.game.round.getQuestions();
        this.io.to(socket.id).emit('getQuestions', questions);
      });
    });
  }
}

module.exports.InGame = InGame;
