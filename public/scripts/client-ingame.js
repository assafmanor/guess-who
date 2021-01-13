import { getCookie } from './utils.js';

const socket = io();

const guessWhoRoomId = JSON.parse(getCookie('guessWhoRoomId'));
const code = guessWhoRoomId.code;
const id = guessWhoRoomId.id;

let thisPlayer;

socket.emit('reconnectPlayer', { code: code, id: id });

socket.on('getPlayerInfo', playerJSON => {
  console.log('getPlayerInfo');
  thisPlayer = playerJSON;
});
