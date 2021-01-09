class Lobby {
  constructor(game) {
    this.game = game;
    this.io = game.io;
    this.newConnectionsHandler();
    // this.newHostHandler();
  }

  newConnectionsHandler() {
    this.io.on('connection', socket => {
      socket.on('updateNewPlayer', data => {
        if (data.code !== this.game.code) return;
        const name = data.name;
        const newPlayer = this.game.addPlayer(name, socket);
        this.io.to(socket.id).emit('getPlayerInfo', newPlayer.getJSON());
      });
    });
  }
}

module.exports.Lobby = Lobby;
