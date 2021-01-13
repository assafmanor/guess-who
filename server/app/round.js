class Round {
<<<<<<< HEAD
  constructor(options, questions) {
    this.questionPacks = options.questionPacks;
    this.numQuestions = options.numQuestions;
    this.questions = questions;
    for (let i = 0; i < options.numQuestions; i++) {
      console.log(`#${i}`);
      console.dir(this.questions.getRandomQuestion(this.questionPacks));
    }
=======
  constructor(options) {
    this.questionPacks = options.questionPacks;
    this.numQuestions = options.numQuestions;
>>>>>>> 782ae1507e02de878a439019dabf4df2aa177de0
  }
}

module.exports.Round = Round;
