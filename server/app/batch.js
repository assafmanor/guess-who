class Batch {
  NUM_ANSWERS_EACH_TIME = +process.env.NUM_ANSWERS_EACH_TIME;
  POINTS_FOR_WRONG_ANSWER = -2;

  constructor(playerId, answers, numPlayers) {
    this.playerId = playerId;
    this.answers = answers;
    this.numPlayers = numPlayers;
    this.numOfPlayersWhoGuessedRight = 0;
  }

  getJSON() {
    return { playerId: this.playerId, answers: this.answers };
  }

  getAddedPoints(choiceId, answerNumber) {
    if (choiceId !== this.playerId) {
      // wrong guess
      return this.POINTS_FOR_WRONG_ANSWER;
    }
    const numRightGuessesBeforeThis = this.numOfPlayersWhoGuessedRight++;
    const pointsForAnswerNumber =
      (this.NUM_ANSWERS_EACH_TIME - answerNumber + 1) * 2;
    const nthRightGuessFactor =
      (this.numPlayers - numRightGuessesBeforeThis) / this.numPlayers;
    const pointsFloat = pointsForAnswerNumber * nthRightGuessFactor;
    return Math.max(1, Math.round(pointsFloat));
  }
}

module.exports.Batch = Batch;
