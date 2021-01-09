const hostButton = document.getElementById('host-btn');
const joinButton = document.getElementById('join-btn');

const joinHostArea = document.getElementById('join-host-area');
const hostArea = document.getElementById('host-area');
const joinArea = document.getElementById('join-area');
const joinCodeArea = document.getElementById('join-code-area');
const joinNameArea = document.getElementById('join-name-area');

const joinCodeForm = document.getElementById('join-code-form');
const joinNameForm = document.getElementById('join-name-form');

const joinBackButton = document.getElementById('join-back');

hostArea.style.display = 'none';
joinArea.style.display = 'none';
joinNameArea.style.display = 'none';

let code;

hostButton.addEventListener('click', () => {
  hostButton.classList.toggle('selected');
  joinButton.classList.remove('selected');
  if (hostArea.style.display === 'none') {
    document.getElementById('host-name').select();
    hostArea.style.display = 'block';
  } else {
    hostArea.style.display = 'none';
  }
  if (joinArea.style.display === 'block') {
    joinArea.style.display = 'none';
  } else {
    joinArea.style.display === 'none';
  }
});

joinButton.addEventListener('click', () => {
  joinButton.classList.toggle('selected');
  hostButton.classList.remove('selected');
  if (joinArea.style.display === 'none') {
    document.getElementById('join-code').select();
    joinArea.style.display = 'block';
  } else {
    joinArea.style.display = 'none';
  }
  if (hostArea.style.display === 'block') {
    hostArea.style.display = 'none';
  }
});

joinCodeForm.addEventListener('submit', event => {
  event.preventDefault();
  const codeEntered = document.getElementById('code').value;
  fetch(`/is-code-valid/${codeEntered}`)
    .then(res => {
      return res.json();
    })
    .then(res => {
      if (res) {
        code = codeEntered;
        joinCodeArea.style.display = 'none';
        joinNameArea.style.display = 'block';
        document.getElementById('join-code').value = code;
        document.getElementById('join-name').select();
      } else {
        document.getElementById('wrong-code-warning').textContent = 'קוד שגוי';
        setTimeout(() => {
          document.getElementById('wrong-code-warning').textContent = ''
        }, 2000);
      }
    });
});

joinNameForm.addEventListener('submit', event => {
  event.preventDefault();
  const name = document.getElementById('join-name').value;
  fetch(`/is-name-valid/${code}/${name}`)
    .then(res => {
      return res.json();
    })
    .then(res => {
      if (res) {
        event.target.submit();
      } else {
        document.getElementById('wrong-name-warning').textContent =
          'השם כבר תפוס';
        setTimeout(() => {
          document.getElementById('wrong-name-warning').textContent = ''
        }, 2000);
      }
    });
});

joinBackButton.addEventListener('click', () => {
  joinNameArea.style.display = 'none';
  joinCodeArea.style.display = 'block';
  code = '';
  document.getElementById('code').value = '';
  document.getElementById('code').select();
  document.getElementById('join-code').value = '';
});
