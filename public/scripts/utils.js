export function showErrorMessage(elementId, message, timeToShow = null) {
  const warningDiv = document.getElementById('join-warning');
  warningDiv.removeAttribute('hidden');
  const element = document.getElementById(elementId);
  element.textContent = message;
  if (timeToShow != null) {
    setTimeout(() => {
      warningDiv.setAttribute('hidden', '');
      element.textContent = '';
    }, timeToShow);
  }
}
