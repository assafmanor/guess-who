const socket = io();

const playerList = document.getElementById('players-list');

let player;

socket.emit('updateNewPlayer', { code: code, name: name });

socket.on('updatePlayerList', playersData => {
  console.log('updatePlayerList');
  playerList.innerHTML = '';
  for (const player of playersData.players) {
    const li = document.createElement('li');
    li.textContent = player.name;
    if (player.isHost) {
      li.textContent += '👑';
    }
    playerList.append(li);
  }
});

socket.on('getPlayerInfo', playerJSON => {
  console.log('getPlayerInfo');
  player = playerJSON;
});

socket.on('updateNewHost', hostData => {
  console.log('updateNewHost');
  console.dir(hostData);
  const hostSocketId = hostData.socketId;
  if (socket.id === hostSocketId) {
    const hostArea = document.getElementById('host-area');
    hostArea.removeAttribute('hidden');
  }
});
