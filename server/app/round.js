const Questions = require('./questions').Questions;

const debug = require('debug')('guesswho:round');

class Round {
  constructor(options) {
    this.NUM_ANSWERS_EACH_TIME = 5;

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
      if (randNum < curSum + playerAnswers.size) {
        const startIndex = randNum - curSum;
        const tmpAnswersArray = Array.from(playerAnswers).slice(
          startIndex,
          startIndex + numAnswers
        );
        // remove these answers from the available answers
        tmpAnswersArray.forEach(([question, answer]) => {
          playerAnswers.delete(question);
        });
        const answers = new Map(tmpAnswersArray);
        return {
          playerId: playerId,
          answers: answers
        };
      }
      curSum += playerAnswers.size;
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
}

module.exports.Round = Round;
