const debug = require('debug')('guesswho:ingame');

class InGame {
  constructor(game) {
    this.game = game;
    this.io = game.io;
    this.round = game.round;
    this.reconnectPlayersHandler();
  }

  reconnectPlayersHandler() {
    this.io.on('connection', socket => {
      socket.on('reconnectPlayer', data => {
        debug('reconnectPlayer');
        if (data.code !== this.game.code) return;
        this.game.reconnectPlayer(data.id, socket);
        const player = this.game.getPlayer(data.id);
        this.round.addPlayer(player);
        // add all handlers
        this.sendQuestionsHandler(socket);
        this.playerDoneAnsweringHandler(socket);
        this.getNextAnswersBatchHandler(socket);
        this.startBatchHandler(socket);
        this.batchOverHandler(socket);
        this.showNextAnswerHandler(socket);
        // send player info to client
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
      const playerData = data.player;
      this.game.getPlayer(playerData.id).isDoneAnswering = true;
      const answers = new Map(JSON.parse(data.answers));
      this.round.answers.set(playerData.id, answers);
      if (this.round.isRoundOver()) {
        debug('updateRoundOver {code: %s}', data.code);
        this.game.sendToAllPlayers('updateRoundOver');
      } else {
        this.game.sendToSelectedPlayers(
          'updateWaitingPlayersList',
          this.game.getPlayerList(player => !player.isDoneAnswering),
          player => player.isDoneAnswering
        );
      }
    });
  }

  getNextAnswersBatchHandler(socket) {
    socket.on('getAnswersBatch', data => {
      if (data.code !== this.game.code) return;
      const answers = this.round.getNextAnswersBatch();
      if (!answers) {
        this.game.sendToAllPlayers('getAnswersBatch', {
          success: false
        });
        return;
      }
      this.game.sendToAllPlayers('getAnswersBatch', {
        success: true,
        result: {
          playerId: answers.playerId,
          answers: JSON.stringify(Array.from(answers.answers))
        }
      });
    });
  }

  startBatchHandler(socket) {
    socket.on('startBatch', data => {
      if (data.code !== this.game.code) return;
      this.game.sendToAllPlayers('startBatch');
    });
  }

  batchOverHandler(socket) {
    socket.on('batchOver', data => {
      if (data.code !== this.game.code) return;
      this.game.sendToAllPlayers('batchOver');
    });
  }

  showNextAnswerHandler(socket) {
    socket.on('showNextAnswer', data => {
      if (data.code !== this.game.code) return;
      this.game.sendToAllPlayers('showNextAnswer');
    });
  }
}

module.exports.InGame = InGame;
