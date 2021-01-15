const Game = require('./game').Game;
const Questions = require('./questions').Questions;

class GuessWho {
  CODE_ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
  CODE_LENGTH = 4;

  constructor(io, devMode) {
    this.io = io;
    this.games = new Map();
    this.devMode = devMode;
    Questions.loadAllPacks();
  }

  createGame(forcedCode = null) {
    let code;
    if (forcedCode) {
      code = forcedCode;
    } else {
      code = this.generateCode();
    }
    const newGame = new Game(
      this.io,
      code,
      this.removeGame.bind(this, code),
      this.devMode
    );
    this.games.set(code, newGame);
    return newGame;
  }

  removeGame(code) {
    const game = this.findGame(code);
    if (game) {
      this.games.delete(code);
    }
  }

  findGame(code) {
    if (!code || code.length !== 4) {
      return false;
    }
    if (this.games.has(code)) {
      return this.games.get(code);
    }
    return false;
  }

  generateCode() {
    let code;
    do {
      code = '';
      for (let i = 0; i < this.CODE_LENGTH; i++) {
        let charIndex = Math.floor(Math.random() * this.CODE_ALPHABET.length);
        code += this.CODE_ALPHABET.charAt(charIndex);
      }
      // so that there are no two games with the same code
    } while (this.findGame(code));
    return code;
  }

  getQuestionPackNames() {
    return Questions.getPackNames();
  }
}

module.exports.GuessWho = GuessWho;
