import { showErrorMessage } from './utils.js';

const code = document.getElementById('join-code').value;

fetch(`/can-join-game/${code}`)
  .then(res => res.json())
  .then(res => {
    // code is valid
    if (res !== false) {
      return;
    }
    const errorMessage = 'מצטערים, החדר מלא.';
    showErrorMessage('join-error-message', errorMessage);
    // disable form
    document.querySelector('form button').disabled = true;
    document.getElementById('join-name').disabled = true;
  });
