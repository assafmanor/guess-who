const Player = require('./player').Player;
const Round = require('./round').Round;

const debug = require('debug')('guesswho:game');

class Game {
  constructor(io, code, onEmpty, devMode) {
    this.io = io;
    this.code = code;
    this.onEmpty = onEmpty;
    this.players = new Map();
    this.host;
    this.inProgress = false;
    this.currentId = 0;
    this.options = { questionPacks: null, numQuestions: null };
    this.round;
    this.devMode = devMode;
    this.MIN_PLAYERS = devMode ? 1 : 3;
    this.MAX_PLAYERS = 8;
  }

  getPlayer(id) {
    if (this.players.has(id)) {
      return this.players.get(id);
    }
    return false; // not found
  }

  playerDisconnectedHandler(player) {
    player.socket.on('disconnect', () => {
      debug('disconnect');
      player.isConnected = false;
      if (!this.inProgress) {
        debug('removing player %d', player.id);
        this.removePlayer(player.id);
      } else {
        if (this.round.activePlayers.has(player.id)) {
          this.round.removeActivePlayer(player.id);
        }
      }
      this.playerDisconnected(player);
      this.sendUpdatedPlayersList();
    });
  }

  initPlayer(player) {
    player.socket.join(this.code);
    debug('initPlayer');
    if (!this.host) {
      this.setHost(player);
    }
    this.playerDisconnectedHandler(player);
  }

  addPlayer(name, socket) {
    let newPlayer = new Player(socket, this.code, name, this.currentId++);
    this.initPlayer(newPlayer);
    this.players.set(newPlayer.id, newPlayer);
    debug('addPlayer {id: %d, name: %s}', newPlayer.id, newPlayer.name);
    this.sendUpdatedPlayersList();
    return newPlayer;
  }

  removePlayer(id) {
    debug('removePlayer(id=%d)', id);
    if (!this.players.has(id)) {
      return false;
    }
    const player = this.players.get(id);
    this.players.delete(id);
    this.deleteGameIfEmpty();
  }

  reconnectPlayer(id, socket) {
    debug("reconnectPlayer(id=%d, socket=...)", id)
    const player = this.getPlayer(id);
    if (!player) {
      throw new Error(`Player id ${id} not found`);
    }
    player.socket = socket;
    player.isConnected = true;
    this.initPlayer(player);
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

  playerDisconnected(player) {
    debug('updatePlayerDisconnected');
    this.deleteGameIfEmpty();
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
    debug('deleteGameIfEmpty');
    const players = Array.from(this.players.values());
    const areThereActivePlayers = players.some(p => p.isConnected);
    let isEmpty = this.players.size === 0 || !areThereActivePlayers;
    if (isEmpty) {
      if (this.inProgress) {
        setTimeout(() => {
          if (this.round.activePlayers.size === 0) {
            debug('deleting game {code: %s}', this.code);
            this.deleteGame();
          }
        }, 1000);
      } else {
        debug('deleting game {code: %s}', this.code);
        this.deleteGame();
      }
    }
  }

  sendUpdatedPlayersList() {
    debug('sendUpdatedPlayersList');
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
    debug('startRound');
    this.round = new Round(this.options);
    this.sendToAllPlayers('startRound');
  }
}

module.exports.Game = Game;
