class Player {
  constructor(socket, roomCode, name, id, isHost = false) {
    this.socket = socket;
    this.roomCode = roomCode;
    this.name = name;
    this.id = id;
    this.isHost = isHost;
    this.isConnected = true;
    this.isDoneAnswering = false;
    this.score = 0;
    this.addedPoints = 0;
  }

  getJSON() {
    return {
      id: this.id,
      roomCode: this.roomCode,
      name: this.name,
      isHost: this.isHost,
      isConnected: this.isConnected,
      isDoneAnswering: this.isDoneAnswering,
      score: this.score,
      addedPoints: this.addedPoints
    };
  }

  send(eventName, data) {
    this.socket.to(this.roomCode).emit(eventName, data);
  }

  makeHost() {
    this.isHost = true;
  }

  reset() {
    this.isDoneAnswering = false;
    this.score = 0;
    this.addedPoints = 0;
  }
}

module.exports.Player = Player;
