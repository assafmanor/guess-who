class InGame {
  constructor(game) {
    this.game = game;
    this.io = game.io;
    this.reconnectPlayersHandler();
  }

  reconnectPlayersHandler() {
    this.io.on('connection', socket => {
      socket.on('reconnectPlayer', data => {
        console.log('reconnectPlayer');
        if (data.code !== this.game.code) return;
        this.game.reconnectPlayer(data.id, socket);
        const player = this.game.getPlayer(data.id);
        this.io.to(socket.id).emit('getPlayerInfo', player.getJSON());
      });
    });
  }
}

module.exports.InGame = InGame;
