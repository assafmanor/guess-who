const Player = require('./player').Player;
const Round = require('./round').Round;

class Game {
  MIN_PLAYERS = 3;
  MAX_PLAYERS = 8;

  constructor(io, code, onEmpty) {
    this.io = io;
    this.code = code;
    this.onEmpty = onEmpty;
    this.players = new Map();
    this.host;
    this.inProgress = false;
    this.currentId = 0;
    this.options = { questionPacks: null, numQuestions: null };
    this.round;
  }

  getPlayer(id) {
    if (this.players.has(id)) {
      return this.players.get(id);
    }
    return false; // not found
  }

  initPlayer(player) {
    player.socket.join(this.code);
    console.log('initPlayer');
    if (!this.host) {
      this.setHost(player);
    }
    // player disconnects
    player.socket.on('disconnect', () => {
      player.isConnected = false;
      if (!this.inProgress) {
        this.removePlayer(player.id);
      }
      this.onPlayerDisconnected(player);
      this.sendUpdatedPlayersList();
    });
  }

  addPlayer(name, socket) {
    let newPlayer = new Player(socket, this.code, name, this.currentId++);
    this.initPlayer(newPlayer);
    this.players.set(newPlayer.id, newPlayer);
    this.sendUpdatedPlayersList();
    return newPlayer;
  }

  removePlayer(id) {
    if (!this.players.has(id)) {
      return false;
    }
    const player = this.players.get(id);
    this.players.delete(id);
    this.deleteGameIfEmpty();
  }

  reconnectPlayer(id, socket) {
    const player = this.getPlayer(id);
    if (!player) {
      throw new Error(`Player id ${id} not found`);
    }
    player.socket = socket;
  }

  deleteGame(game) {
    this.onEmpty();
  }

  getJSON() {
    let playersJSON = Array.from(this.players.values()).map(player =>
      player.getJSON()
    );
    return {
      code: this.code,
      players: playersJSON,
      inProgress: this.inProgress
    };
  }

  onPlayerDisconnected(player) {
    console.log('onPlayerDisconnected');
    if (this.deleteGameIfEmpty()) {
    }
    if (!this.host || (this.host && this.host === player)) {
      // find new host
      this.host = null;

      for (const player of this.players.values()) {
        if (player.isConnected) {
          this.setHost(player);
          break;
        }
      }
    }
  }

  deleteGameIfEmpty() {
    console.log('deleteGameIfEmpty');
    if (this.players.size === 0) {
      // delete game after 5 seconds of being empty
      setTimeout(() => {
        if (this.players.size === 0) {
          this.deleteGame();
        }
      }, 5000);
      return true;
    }
    return false;
  }

  sendUpdatedPlayersList() {
    console.log('sendUpdatedPlayersList');
    this.sendToAllPlayers('updatePlayerList', {
      players: Array.from(this.players.values()).map(player => player.getJSON())
    });
  }

  sendToAllPlayers(eventName, data) {
    this.io.to(this.code).emit(eventName, data);
  }

  setHost(player) {
    this.host = player;
    player.makeHost();
    this.sendToAllPlayers('updateNewHost', { socketId: player.socket.id });
  }

  startRound() {
    this.inProgress = true;
    console.log('startRound');
    this.round = new Round(this.options);
    this.sendToAllPlayers('startRound');
  }
}

module.exports.Game = Game;
