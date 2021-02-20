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
