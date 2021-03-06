const Player = require('./player').Player;
const Round = require('./round').Round;
const Questions = require('./questions').Questions;

const debug = require('debug')('guesswho:game');

class Game {
  constructor(io, code, onEmpty, devMode) {
    this.MIN_PLAYERS = devMode ? 1 : +process.env.MIN_PLAYERS;
    this.MAX_PLAYERS = +process.env.MAX_PLAYERS;

    this._currentId = 0;

    this.io = io;
    this.code = code;
    this.onEmpty = onEmpty;
    this.players = new Map();
    this.host;
    this.inProgress = false;
    this.isEmpty = true;
    this.options = { questionPacks: null, numQuestions: null };
    this.round;
    this.devMode = devMode;
    this.deleteGameTimeout;
    this.numConnections = 0;
    this.waitingForPlayers = false;
    this.ingame;
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
        if (this.round && this.round.activePlayers.has(player.id)) {
          this.round.removeActivePlayer(player.id);
        }
      }
      this.playerDisconnected(player);
      this.sendUpdatedPlayersList();
    });
  }

  initPlayer(player) {
    player.socket.join(this.code);
    this.numConnections++;
    debug('initPlayer');
    if (!this.host) {
      this.setHost(player);
    }
    if (this.isEmpty) {
      this.isEmpty = false;
      // make sure to clear any delete timeout
      clearTimeout(this.deleteGameTimeout);
      this.deleteGameTimeout = null;
    }
    // check minimum players
    if (this.getNumActivePlayers() >= this.MIN_PLAYERS) {
      this.sendToAllPlayers('updateMinimumPlayers', { result: true });
    }
    this.playerDisconnectedHandler(player);
  }

  addPlayer(name, socket) {
    let newPlayer = new Player(socket, this.code, name, this._currentId++);
    this.players.set(newPlayer.id, newPlayer);
    this.initPlayer(newPlayer);
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
    debug('reconnectPlayer(id=%d, socket=...)', id);
    const player = this.getPlayer(id);
    if (!player) {
      throw new Error(`Player id ${id} not found`);
    }
    player.socket = socket;
    player.isConnected = true;
    this.initPlayer(player);
    this.updateWaitingForPlayers();
    if (player.isHost) {
      this.setHost(player);
    }
    this.sendUpdatedPlayersList();
    return player;
  }

  updateWaitingForPlayers() {
    debug(
      'players.size = %d, numConnections = %d',
      this.players.size,
      this.numConnections
    );
    if (this.players.size === this.numConnections) {
      this.waitingForPlayers = false;
      if (!this.round) {
        this.inProgress = false;
      }
    }
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
    // this.numConnections--;
    this.deleteGameIfEmpty();
    // check minimum players
    if (this.getNumActivePlayers() < this.MIN_PLAYERS) {
      this.sendToAllPlayers('updateMinimumPlayers', { result: false });
    }
    if (
      !this.waitingForPlayers &&
      (!this.host || (this.host && this.host === player))
    ) {
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
      this.isEmpty = true;
      if (this.deleteGameTimeout) {
        clearTimeout(this.deleteGameTimeout);
      }
      this.deleteGameTimeout = setTimeout(() => {
        if (this.isEmpty) {
          debug('deleting game {code: %s}', this.code);
          this.deleteGame();
        }
        this.deleteGameTimeout = null;
      }, 5000);
    }
  }

  getPlayerList(filter = player => true) {
    const allPlayers = Array.from(this.players.values());
    return {
      players: allPlayers.filter(filter).map(player => player.getJSON())
    };
  }

  sendUpdatedPlayersList() {
    debug('sendUpdatedPlayersList');
    this.sendToAllPlayers('updatePlayerList', this.getPlayerList());
  }

  sendPlayerList() {
    debug('sendPlayersList');
    this.sendToAllPlayers('getPlayerList', this.getPlayerList());
  }

  sendToAllPlayers(eventName, data) {
    this.io.to(this.code).emit(eventName, data);
  }

  sendToSelectedPlayers(eventName, data, filter) {
    debug('sendToSelectedPlayers');
    Array.from(this.players.values())
      .filter(filter)
      .forEach(player => {
        debug('sending %s to %s', eventName, player.name);
        this.io.to(player.socket.id).emit(eventName, data);
      });
  }

  setHost(player) {
    this.host = player;
    player.makeHost();
    this.io.to(player.socket.id).emit('updateNewHost');
    this.io
      .to(player.socket.id)
      .emit('getQuestionPackInfo', this.getQuestionPackInfo());
  }

  getQuestionPackInfo() {
    return Questions.getPacksInfo();
  }

  startRound() {
    this.inProgress = true;
    debug('startRound');
    this.round = new Round(this.options);
    this.sendToAllPlayers('startRound');
    this.waitingForPlayers = true;
    this.numConnections = 0;
    return this.round;
  }

  endRound() {
    debug('endRound');
    delete this.round;
    this.round = null;
    this.waitingForPlayers = true;
    // this.ingame.destruct();
    // delete this.ingame;
    // this.ingame = null;
    this.numConnections = 0;
    this.players.forEach(player => {
      player.reset();
    });
  }

  getNumActivePlayers() {
    return Array.from(this.players.values())
      .map(player => player.isConnected)
      .reduce((acc, isConnected) => acc + (isConnected ? 1 : 0), 0);
  }

  removeDisconnectedPlayers() {
    debug('removeDisconnectedPlayers');
    Array.from(this.players.values())
      .filter(player => !player.isConnected)
      .forEach(player => {
        this.players.delete(player.id);
      });
    debug(this.players);
  }
}

module.exports.Game = Game;
