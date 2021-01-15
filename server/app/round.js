const Questions = require('./questions').Questions;

const debug = require('debug')('guesswho:round');

class Round {
  constructor(options) {
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
    let questions = [];
    const addedQuestionIds = new Set();
    let numOfAddedQuestions = 0;
    let currentQuestion;
    while (numOfAddedQuestions < this.numQuestions) {
      currentQuestion = Questions.getRandomQuestion(this.questionPacks);
      if (addedQuestionIds.has(currentQuestion.id)) {
        continue;
      }
      questions.push(currentQuestion);
      addedQuestionIds.add(currentQuestion.id);
      numOfAddedQuestions++;
    }
    return questions;
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
