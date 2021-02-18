const Questions = require('./questions').Questions;

const debug = require('debug')('guesswho:round');

class Round {
  constructor(options) {
    this.NUM_ANSWERS_EACH_TIME = +process.env.NUM_ANSWERS_EACH_TIME;

    this.questionPacks = options.questionPacks;
    this.numQuestions = options.numQuestions;
    this.activePlayers = new Map();
    // a map from player id to their answers
    this.answers = new Map();
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

  _getNumOfRemainingAnswers() {
    let count = 0;
    for (const playerAnswers of this.answers.values()) {
      count += playerAnswers.size;
    }
    debug('_getNumOfRemainingAnswers: %d', count);
    return count;
  }

  getNextAnswersBatch(numAnswers = this.NUM_ANSWERS_EACH_TIME) {
    debug('getNextAnswersBatch()');
    const numRemainingAnswers = this._getNumOfRemainingAnswers();
    if (numRemainingAnswers === 0) {
      // no answers to return
      return null;
    }
    // choose a random number between 0 and (the number of remaining answers / numAnswers)
    // and then multiply it by numAnswers so that it'll be a multiple of numAnswers
    const randNum =
      Math.floor((Math.random() * numRemainingAnswers) / numAnswers) *
      numAnswers;
    let curSum = 0;
    for (const [playerId, playerAnswers] of this.answers) {
      if (randNum >= curSum + playerAnswers.size) {
        curSum += playerAnswers.size;
        continue;
      }
      // got to the player from which it was chosen to take the answers from
      // we just need to calculate the index to start from
      const startIndex = randNum - curSum;
      const tmpAnswersArray = Array.from(playerAnswers).slice(
        startIndex,
        startIndex + numAnswers
      );
      // remove chosen answers from the available answers
      tmpAnswersArray.forEach(([question, _]) => {
        playerAnswers.delete(question);
      });
      const answers = new Map(tmpAnswersArray);
      return {
        playerId: playerId,
        answers: answers
      };
    }
  }

  removeActivePlayer(playerId) {
    debug('removeActivePlayer()');
    this.activePlayers.delete(playerId);
  }

  isRoundOver() {
    debug('isRoundOver()');
    for (const playerId of this.activePlayers.keys()) {
      if (!this.answers.has(playerId)) {
        return false;
      }
    }
    return true;
  }

  startBatch() {
    // reset all players' added points
    this.activePlayers.forEach(player => {
      player.addedPoints = 0;
    });
  }

  updateScore(player, answerNumber) {
    player.addedPoints = this._calculatePoints(answerNumber);
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
