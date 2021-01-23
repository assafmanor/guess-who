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

  static getRandomQuestion(packNames) {
    let packs = [];
    let numberOfQuestions = 0;
    packNames.forEach(packName => {
      const pack = this.allPacks.get(packName);
      packs.push(pack);
      numberOfQuestions += pack.length;
    });
    const randNum = Math.floor(Math.random() * numberOfQuestions);
    let curSum = 0;
    for (const pack of packs) {
      if (randNum < curSum + pack.length) {
        return pack[randNum - curSum];
      }
      curSum += pack.length;
    }
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
