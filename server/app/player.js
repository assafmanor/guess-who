class Player {
  constructor(socket, roomCode, name, id, isHost = false) {
    this.socket = socket;
    this.roomCode = roomCode;
    this.name = name;
    this.id = id;
    this.isHost = isHost;
    this.isConnected = true;  
  }

  getJSON() {
    return {
      id: this.id,
      roomCode: this.roomCode,
      name: this.name,
      isHost: this.isHost,
      isConnected: this.isConnected
    };
  }

  send(eventName, data) {
    this.socket.to(this.roomCode).emit(eventName, data);
  }

  makeHost() {
    this.isHost = true;
  }
}

module.exports.Player = Player;
