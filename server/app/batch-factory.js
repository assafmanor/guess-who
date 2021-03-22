const Batch = require('./batch').Batch;

const debug = require('debug')('guesswho:batch-factory');

class BatchFactory {
  NUM_ANSWERS_EACH_TIME = +process.env.NUM_ANSWERS_EACH_TIME;

  constructor(round, answers) {
    this.round = round;
    this.answers = answers;
  }

  _getNumOfRemainingAnswers() {
    let count = 0;
    for (const playerAnswers of this.answers.values()) {
      count += playerAnswers.size;
    }
    return count;
  }

  nextBatch(numAnswers = this.NUM_ANSWERS_EACH_TIME) {
    debug('getNextAnswersBatch()');
    const numRemainingAnswers = this._getNumOfRemainingAnswers();
    if (numRemainingAnswers === 0) {
      // no answers to return
      return { value: null, done: true };
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
      const batch = new Batch(playerId, answers, this.round);
      return {
        value: batch,
        done: false
      };
    }
  }
}

module.exports.BatchFactory = BatchFactory;
