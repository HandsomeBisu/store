import { auth } from './firebase.js';
import { applyActionCode } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const actionCode = urlParams.get('oobCode');
    const messageElement = document.getElementById('message');
    const loginRedirectBtn = document.getElementById('loginRedirectBtn');

    if (mode === 'verifyEmail' && actionCode) {
        applyActionCode(auth, actionCode).then(() => {
            messageElement.textContent = '이메일이 성공적으로 확인되었습니다! 이제 로그인할 수 있습니다.';
            messageElement.style.backgroundColor = '#d4edda'; // Green for success
            messageElement.style.color = '#155724';
            loginRedirectBtn.style.display = 'block'; // Show login button
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000); // Redirect after 3 seconds
        }).catch((error) => {
            messageElement.textContent = `이메일 확인 중 오류가 발생했습니다: ${error.message}`;
            messageElement.style.backgroundColor = '#ffebee'; // Red for error
            messageElement.style.color = '#c62828';
            loginRedirectBtn.style.display = 'block'; // Show login button
        });
    } else {
        messageElement.textContent = '유효하지 않은 이메일 확인 링크입니다.';
        messageElement.style.backgroundColor = '#ffebee'; // Red for error
        messageElement.style.color = '#c62828';
        loginRedirectBtn.style.display = 'block'; // Show login button
    }
});