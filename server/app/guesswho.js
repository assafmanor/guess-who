Game = require('./game').Game;

class GuessWho {
  CODE_ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
  CODE_LENGTH = 4;

  constructor(io) {
    this.io = io;
    this.games = new Map();
  }

  createGame(forcedCode = null) {
    let code;
    if (forcedCode) {
      code = forcedCode;
    } else {
      code = this.generateCode();
    }
    const newGame = new Game(this.io, code, this.removeGame.bind(this, code));
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
}

module.exports.GuessWho = GuessWho;