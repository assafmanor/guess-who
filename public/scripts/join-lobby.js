import { showErrorMessage } from './utils.js';

const code = document.getElementById('join-code').value;

fetch(`/can-join-game/${code}`)
  .then(res => res.json())
  .then(res => {
    // code is valid
    if (res.result) {
      return;
    }
    const errorMessage = `מצטערים, ${res.errorMessage}.`;
    showErrorMessage('join-error-message', errorMessage);
    // disable form
    document.querySelector('form .btn').disabled = true;
    document.getElementById('join-name').disabled = true;
  });
