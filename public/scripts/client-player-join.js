import { showErrorMessage } from './utils.js';

const joinNameForm = document.getElementById('join-name-form');

joinNameForm.addEventListener('submit', event => {
  event.preventDefault();
  const name = document.getElementById('join-name').value;
  const code = document.getElementById('join-code').value;
  console.log('name: ' + name);
  console.log('code: ' + code);
  fetch(`/is-name-valid/${code}/${name}`)
    .then(res => {
      return res.json();
    })
    .then(res => {
      if (res.result) {
        event.target.submit();
      } else {
        const errorMessage = 'השם כבר תפוס.';
        showErrorMessage('join-error-message', errorMessage, 2000);
      }
    });
});
