import { auth } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
    const bottomNavAuthLink = document.getElementById('bottom-nav-auth-link');

    if (bottomNavAuthLink) {
        auth.onAuthStateChanged(user => {
            const navLabel = bottomNavAuthLink.querySelector('.nav-label');
            if (user) {
                bottomNavAuthLink.href = 'mypage.html';
                if (navLabel) {
                    navLabel.textContent = '마이';
                }
            } else {
                bottomNavAuthLink.href = 'login.html';
                if (navLabel) {
                    navLabel.textContent = '로그인';
                }
            }
            // Set active class based on current page
            const currentPath = window.location.pathname.split('/').pop();
            if (user && currentPath === 'mypage.html') {
                bottomNavAuthLink.classList.add('active');
            } else if (!user && currentPath === 'login.html') {
                bottomNavAuthLink.classList.add('active');
            } else {
                bottomNavAuthLink.classList.remove('active');
            }
        });
    }
});
