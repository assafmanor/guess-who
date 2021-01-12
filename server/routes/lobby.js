class Lobby {
  constructor(game) {
    this.game = game;
    this.io = game.io;
    this.newConnectionsHandler();
    this.optionChangedHandler('numQuestionsChanged', 'numQuestions');
    this.optionChangedHandler('questionPackChanged', 'questionPack');
  }

  newConnectionsHandler() {
    this.io.on('connection', socket => {
      socket.on('updateNewPlayer', data => {
        console.log('updateNewPlayer');
        if (data.code !== this.game.code) return;
        const name = data.name;
        const newPlayer = this.game.addPlayer(name, socket);
        this.io.to(socket.id).emit('getPlayerInfo', newPlayer.getJSON());
        this.io.to(socket.id).emit('getGameOptions', this.game.options);
      });
    });
  }

  optionChangedHandler(eventName, optionName) {
    this.io.on('connection', socket => {
      socket.on(eventName, data => {
        if (data.player.roomCode !== this.game.code) return;
        this.game.options[optionName] = data.value;
        this.game.sendToAllPlayers(eventName, data);
        const player = this.game.getPlayer(data.player.id);
        if (player) {
          player.send(eventName, data);
        }
      });
    });
  }
}

module.exports.Lobby = Lobby;
