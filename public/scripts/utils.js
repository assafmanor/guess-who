export function showErrorMessage(warningDivId, message, timeToShow = null) {
  const warningDiv = document.getElementById(warningDivId);
  warningDiv.removeAttribute('hidden');
  const element = warningDiv.querySelector('p');
  element.textContent = message;
  if (timeToShow != null) {
    setTimeout(() => {
      warningDiv.setAttribute('hidden', '');
      element.textContent = '';
    }, timeToShow);
  }
}

export function getCookie(name) {
  var cookieArr = document.cookie.split(';');
  for (let i = 0; i < cookieArr.length; i++) {
    let cookiePair = cookieArr[i].split('=');
    if (name == cookiePair[0].trim()) {
      return decodeURIComponent(cookiePair[1]);
    }
  }
  return null;
}

export function deleteCookie(name, path = '/') {
  if (getCookie(name)) {
    console.log(`deleteCookie('${name}')`);
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`;
  }
}

export function setServerTime(socket, code) {
  console.log('setServerTime');
  return new Promise(resolve => {
    socket.emit('setServerTime', { code: code });
    socket.once('setServerTime', data => {
      resolve(data.timestamp);
    });
  });
}

export function getServerTime(socket, code) {
  console.log('getServerTime');
  return new Promise(resolve => {
    socket.emit('getServerTime', { code: code });
    socket.once('getServerTime', data => {
      resolve(data.timestamp);
    });
  });
}

/**
 * sets an interval for @time seconds, updates the countdownEl to show the time left,
 * and when the countdown runs out - calls @afterTimeoutCallback
 * @param  {Number} serverNow the time 'now' according to the server.
 * @param  {HTMLElement} countdownEl the function will update this element's text content to reflect the time left.
 * @param  {Number} countdownTime countdown time in seconds.
 * @param  {Function} afterTimeoutCallback this callback will be called when the countdown runs out.
 * @return {NodeJS.Timeout} returns the interval set by the function.
 */

export function setCountdown(
  serverNow,
  countdownEl,
  countdownTime,
  afterTimeoutCallback
) {
  let countdownEndTime = serverNow + countdownTime * 1000;
  let secondsLeft;
  const intervalCallback = () => {
    // update countdown element
    if (Date.now() >= countdownEndTime + 1000) {
      clearInterval(interval);
      afterTimeoutCallback();
      return;
    }
    const timeLeft = countdownEndTime - Date.now();
    secondsLeft = Math.round(timeLeft / 1000);
    countdownEl.textContent =
      '00:' + Number(secondsLeft).toString().padStart(2, '0');
  };
  // call callback so that the countdown starts immediately
  intervalCallback();
  const interval = setInterval(intervalCallback, 1000);
  return interval;
}
