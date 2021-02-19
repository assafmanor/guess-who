const BatchFactory = require('./batch-factory').BatchFactory;
const Questions = require('./questions').Questions;

const debug = require('debug')('guesswho:round');

class Round {
  constructor({ questionPacks, numQuestions }) {
    this.questionPacks = questionPacks;
    this.numQuestions = numQuestions;
    this.activePlayers = new Map();
    // a map from player id to their answers
    this.answers = new Map();
    this.batchFactory;
    this.currentBatch;
  }

  addPlayer(player) {
    this.activePlayers.set(player.id, player);
  }

  getQuestions() {
    debug('getQuestions()');
    if (
      this.numQuestions > Questions.getNumberOfQuestions(this.questionPacks)
    ) {
      throw new Error('Cannot get enough questions');
    }
    return Questions.getNRandomQuestions(this.questionPacks, this.numQuestions);
  }

  getNextAnswersBatch(numAnswers = this.NUM_ANSWERS_EACH_TIME) {
    debug('getNextAnswersBatch()');
    if (!this.batchFactory) {
      this.batchFactory = new BatchFactory(
        this.activePlayers.size,
        this.answers
      );
    }
    const nextBatchResults = this.batchFactory.nextBatch();
    if (nextBatchResults.done) {
      return null;
    }
    this.currentBatch = nextBatchResults.value;
    return this.currentBatch.getJSON();
  }

  removeActivePlayer(playerId) {
    debug('removeActivePlayer()');
    this.activePlayers.delete(playerId);
  }

  isRoundOver() {
    debug('isRoundOver()');
    for (const playerId of this.activePlayers.keys()) {
      debug('isRoundOver, %d', playerId);
      if (
        !this.answers.has(playerId) ||
        this.answers.get(playerId).size === 0
      ) {
        return false;
      }
    }
    debug('isRoundOver, answers: ');
    return true;
  }

  startBatch() {
    // reset all players' added points
    this.activePlayers.forEach(player => {
      player.addedPoints = 0;
    });
  }

  updateScore(player, choiceId, answerNumber) {
    player.addedPoints = this.currentBatch.getAddedPoints(
      choiceId,
      answerNumber
    );
    player.score += player.addedPoints;
  }

  _calculatePoints(answerNumber) {
    debug(
      '_calculatePoints: %d - %d + 1',
      this.NUM_ANSWERS_EACH_TIME,
      answerNumber
    );
    return this.NUM_ANSWERS_EACH_TIME - answerNumber + 1;
  }
}

module.exports.Round = Round;
