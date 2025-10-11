import { auth } from './firebase.js';
import { applyActionCode } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const actionCode = urlParams.get('oobCode');
    const messageElement = document.getElementById('message');

    if (mode === 'verifyEmail' && actionCode) {
        applyActionCode(auth, actionCode).then(() => {
            messageElement.textContent = 'Email verified successfully! You can now login.';
        }).catch((error) => {
            messageElement.textContent = 'Error verifying email: ' + error.message;
        });
    }
});