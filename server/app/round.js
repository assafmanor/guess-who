const Questions = require('./questions').Questions;

class Round {
  constructor(options) {
    this.questionPacks = options.questionPacks;
    this.numQuestions = options.numQuestions;
  }

  getQuestions() {
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
}

module.exports.Round = Round;
