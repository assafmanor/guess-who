class Round {
  constructor(options, questions) {
    this.questionPacks = options.questionPacks;
    this.numQuestions = options.numQuestions;
    this.questions = questions;
    for (let i = 0; i < options.numQuestions; i++) {
      console.log(`#${i}`);
      console.dir(this.questions.getRandomQuestion(this.questionPacks));
    }
  }
}

module.exports.Round = Round;
