var path = require('path');
const fs = require('fs');

class Questions {
  static PACKS_PATH = path.join(__dirname, '../questions');
  static allPacks = new Map();
  constructor() {}

  static loadAllPacks() {
    console.log('loadAllPacks');
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

  static getNumberOfQuestions(packNames) {
    return packNames
      .map(packName => this.allPacks.get(packName))
      .reduce((sum, pack) => sum + pack.length, 0);
  }

  static getPackNames() {
    return Array.from(this.allPacks.keys());
  }
}

module.exports.Questions = Questions;
