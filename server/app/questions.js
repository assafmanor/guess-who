var path = require('path');
const fs = require('fs');
const debug = require('debug')('guesswho:questions');

class Questions {
  static PACKS_PATH = path.join(__dirname, '../questions');
  static allPacks = new Map();
  constructor() {}

  static loadAllPacks() {
    debug('loadAllPacks');
    let uniqueId = 0;
    fs.readdir(this.PACKS_PATH, (err, filenames) => {
      filenames.forEach(filename => {
        fs.readFile(this.PACKS_PATH + '/' + filename, (err, content) => {
          const pack = JSON.parse(content);
          pack.questions.forEach(question => {
            question.pack = pack.name;
            question.id = uniqueId++;
          });
          this.allPacks.set(pack.name, pack.questions);
        });
      });
    });
  }

  static _rnd(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  static _swap(array, i, j) {
    [array[i], array[j]] = [array[j], array[i]];
  }

  static getNRandomQuestions(packNames, n) {
    let allQuestions = [];
    packNames.forEach(packName => {
      const pack = this.allPacks.get(packName);
      allQuestions.push(...pack);
    });
    let chosenQuestions = [];
    for (let i = 0; i < n; i++) {
      const randIdx = this._rnd(i, allQuestions.length - 1);
      chosenQuestions.push(allQuestions[randIdx]);
      // swap elements in the array to make sure this question does not get chosen again
      this._swap(allQuestions, randIdx, i);
    }
    return chosenQuestions;
  }

  static _getNumOfQuestionsOnePack(packName) {
    return this.allPacks.get(packName).length;
  }

  static getNumberOfQuestions(packNames) {
    debug('getNumberOfQuestions');
    const sum = packNames
      .map(packName => this.allPacks.get(packName))
      .reduce((sum, pack) => sum + pack.length, 0);
    if (sum === NaN) {
      throw new Error('שמות חבילות לא תקינות');
    }
    return sum;
  }

  static getPackNames() {
    return Array.from(this.allPacks.keys());
  }

  static getPacksInfo() {
    return Array.from(this.allPacks.keys()).map(packName => ({
      name: packName,
      numQuestions: this._getNumOfQuestionsOnePack(packName)
    }));
  }
}

module.exports.Questions = Questions;
