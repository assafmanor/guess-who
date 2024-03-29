const debug = require('debug')('guesswho:ingame');

class InGame {
  constructor(game) {
    this.game = game;
    this.io = game.io;
    this.round = game.round;
    this.reconnectPlayersHandler();
    this.serverTime = null;
  }

  updateNewRound(round) {
    this.round = round;
  }

  reconnectPlayersHandler() {
    this.io.on('connection', socket => {
      socket.once('reconnectPlayerIngame', data => {
        debug('reconnectPlayerIngame');
        if (data.code !== this.game.code) return;
        const player = this.game.getPlayer(data.id);
        if (player && player.isConnected) return;
        this.game.reconnectPlayer(data.id, socket);
        this.round.addPlayer(player);
        // add all handlers
        this.sendQuestionsHandler(socket);
        this.playerDoneAnsweringHandler(socket);
        this.getNextAnswersBatchHandler(socket);
        this.startBatchHandler(socket);
        this.batchOverHandler(socket);
        this.showNextAnswerHandler(socket);
        this.getPlayerListHandler(socket);
        this.voteHandler(socket);
        this.getScoresHandler(socket);
        this.returnToLobbyHandler(socket);
        this.voteSkipAnswerHandler(socket);
        this.setServerTimeHandler(socket);
        this.getServerTimeHandler(socket);
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
          player: {
            id: answers.playerId,
            name: this.game.getPlayer(answers.playerId).name
          },
          answers: JSON.stringify(Array.from(answers.answers))
        }
      });
    });
  }

  startBatchHandler(socket) {
    socket.on('startBatch', data => {
      if (data.code !== this.game.code) return;
      this.game.sendToAllPlayers('startBatch');
      this.round.startBatch();
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
      this.serverTime = null;
      this.game.sendToAllPlayers('showNextAnswer');
    });
  }

  getPlayerListHandler(socket) {
    socket.on('getPlayerList', data => {
      if (data.code !== this.game.code) return;
      this.game.sendPlayerList();
    });
  }

  voteHandler(socket) {
    socket.on('makeVote', data => {
      if (data.code !== this.game.code) return;
      const playerData = data.player;
      const player = this.game.getPlayer(playerData.id);
      this.round.updateScore(player, data.choice.id, data.answerNumber);
      this.game.sendToAllPlayers('updatePoll', { choice: data.choice });
    });
  }

  getScoresHandler(socket) {
    socket.on('getScores', data => {
      if (data.code !== this.game.code) return;
      this.game.getPlayerList().players.forEach(player => {
        debug(player);
      });
      const scores = this.game.getPlayerList().players.map(player => ({
        name: player.name,
        score: player.score,
        addedPoints: player.addedPoints
      }));
      this.game.sendToAllPlayers('getScores', { scores: scores });
    });
  }

  returnToLobbyHandler(socket) {
    socket.on('returnToLobby', data => {
      if (data.code !== this.game.code) return;
      this.game.endRound();
      this.game.removeDisconnectedPlayers();
      this.game.sendToAllPlayers('returnToLobby');
    });
  }

  voteSkipAnswerHandler(socket) {
    socket.on('voteSkipAnswer', data => {
      if (data.code !== this.game.code) return;
      const numVotes = this.round.currentBatch.voteSkip(
        data.answerNumber,
        data.player.id
      );
      if (this.round.currentBatch.isOkToSkip(data.answerNumber)) {
        this.game.sendToAllPlayers('skipAnswer');
      } else {
        this.game.sendToAllPlayers('skipAnswerUpdate', { numVotes: numVotes });
      }
    });
  }

  setServerTimeHandler(socket) {
    socket.on('setServerTime', data => {
      if (data.code !== this.game.code) return;
      this.serverTime = Date.now();
      this.game.sendToAllPlayers('getServerTime', {
        timestamp: this.serverTime
      });
    });
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getServerTime() {
    return new Promise(async resolve => {
      while (!this.serverTime) {
        await this._sleep(50);
      }
      resolve(this.serverTime);
    });
  }

  getServerTimeHandler(socket) {
    socket.on('getServerTime', async data => {
      if (data.code !== this.game.code) return;
      const serverTime = await this.getServerTime();
      this.game.sendToAllPlayers('getServerTime', {
        timestamp: serverTime
      });
    });
  }
}

module.exports.InGame = InGame;
