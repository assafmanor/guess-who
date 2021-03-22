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

/**
 * sets an interval for @time seconds, updates the countdownEl to show the time left,
 * and when the countdown runs out - calls @afterTimeoutCallback
 * @param  {[HTMLElement]} countdownEl the function will update this element's text content to reflect the time left.
 * @param  {[Number]} time countdown time in seconds.
 * @param  {[Function]} afterTimeoutCallback this callback will be called when the countdown runs out.
 * @return {[Number]} returns the interval set by the function.
 */

export function setCountdown(countdownEl, time, afterTimeoutCallback) {
  let timeLeft = time;
  const intervalCallback = () => {
    // update countdown element
    if (timeLeft < 0) {
      clearInterval(interval);
      afterTimeoutCallback();
      return;
    }
    countdownEl.textContent = timeLeft;
    timeLeft--;
  };
  // call callback so that the countdown starts immediately
  intervalCallback();
  const interval = setInterval(intervalCallback, 1000);
  return interval;
}
