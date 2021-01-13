const Questions = require('./questions').Questions;

class Round {
  constructor(options, questions) {
    this.questionPacks = options.questionPacks;
    this.numQuestions = options.numQuestions;
    this.questions = questions;
    for (let i = 0; i < options.numQuestions; i++) {
      console.log(`#${i}`);
      console.dir(Questions.getRandomQuestion(this.questionPacks));
    }
  }
}

module.exports.Round = Round;
