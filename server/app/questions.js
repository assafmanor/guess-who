var path = require('path');
const fs = require('fs');

class Questions {
  PACKS_PATH = path.join(__dirname, '../questions');

  constructor() {
    this.packs = new Map();
    this.loadAllPacks();
  }

  loadAllPacks() {
    console.log('loadAllPacks');
    fs.readdir(this.PACKS_PATH, (err, filenames) => {
      filenames.forEach(filename => {
        fs.readFile(this.PACKS_PATH + '/' + filename, (err, content) => {
          const pack = JSON.parse(content);
          this.packs.set(pack.name, pack.questions);
        });
      });
    });
  }

  getPackNames() {
    return Array.from(this.packs.keys());
  }

  getRandomQuestion(packNames) {
    let packs = [];
    let numberOfQuestions = 0;
    packNames.forEach(packName => {
      const pack = this.packs.get(packName);
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
}

module.exports.Questions = Questions;
