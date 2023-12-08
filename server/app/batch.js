const debug = require('debug')('guesswho:batch');

class Batch {
  NUM_ANSWERS_EACH_TIME = +process.env.NUM_ANSWERS_EACH_TIME;
  POINTS_FOR_WRONG_ANSWER = -2;

  constructor(playerId, answers, round) {
    this.playerId = playerId;
    this.answers = answers;
    this.round = round;
    this.numOfPlayersWhoGuessedRight = 0;
    this.skipsVoted = new Array(this.answers.size);
    // init all skip votes to 1 as the player whose answers are shown cannot vote to skip
    for (let i = 0; i < this.skipsVoted.length; i++) {
      this.skipsVoted[i] = {
        numVotes: 1,
        whoVoted: new Map([[playerId]])
      };
    }
  }

  getJSON() {
    return { playerId: this.playerId, answers: this.answers };
  }

  getAddedPoints(choiceId, numberOfAnswers) {
    if (choiceId !== this.playerId) {
      // wrong guess
      return this.POINTS_FOR_WRONG_ANSWER;
    }
    const numPlayers = this.round.activePlayers.size;
    const numRightGuessesBeforeThis = this.numOfPlayersWhoGuessedRight++;
    const pointsForAnswerNumber =
      (this.NUM_ANSWERS_EACH_TIME - numberOfAnswers + 1) * 2;
    const nthRightGuessFactor =
      (numPlayers - numRightGuessesBeforeThis) / numPlayers;
    const pointsFloat = pointsForAnswerNumber * nthRightGuessFactor;
    return Math.max(1, Math.round(pointsFloat));
  }

  voteSkip(answerNumber, playerId) {
    if (this.skipsVoted[answerNumber].whoVoted.has(playerId)) return;
    this.skipsVoted[answerNumber].whoVoted.set(playerId);
    this.skipsVoted[answerNumber].numVotes++;
    return this.skipsVoted[answerNumber].numVotes;
  }

  isOkToSkip(answerNumber) {
    return (
      this.skipsVoted[answerNumber].numVotes === this.round.activePlayers.size
    );
  }
}

module.exports.Batch = Batch;
