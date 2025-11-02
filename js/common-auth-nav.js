import { auth, signOutUser } from './auth.js';

const ADMIN_UID = '6QEjtptLkwVeFOQB3cOjU12yvAA3';

document.addEventListener('DOMContentLoaded', () => {
    const authContainer = document.getElementById('auth-container');
    const bottomNavAuthLink = document.getElementById('bottom-nav-auth-link');
    const adminButton = document.getElementById('admin-button');

    auth.onAuthStateChanged(user => {
        if (user) {
            // User is logged in
            if (authContainer) {
                authContainer.innerHTML = `<a href="#" id="logout-btn" class="btn">로그아웃</a>`;
                const logoutBtn = document.getElementById('logout-btn');
                if(logoutBtn) {
                    logoutBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        await signOutUser();
                        window.location.href = 'index.html';
                    });
                }
            }

            if (bottomNavAuthLink) {
                const navLabel = bottomNavAuthLink.querySelector('.nav-label');
                bottomNavAuthLink.href = 'mypage.html';
                if (navLabel) {
                    navLabel.textContent = '마이';
                }
            }

            if (user.uid === ADMIN_UID) {
                if (adminButton) {
                    adminButton.style.display = 'block';
                }
            }
        } else {
            // User is not logged in
            if (authContainer) {
                authContainer.innerHTML = `<a href="login.html" id="login-btn" class="btn">로그인</a>`;
            }

            if (bottomNavAuthLink) {
                const navLabel = bottomNavAuthLink.querySelector('.nav-label');
                bottomNavAuthLink.href = 'login.html';
                if (navLabel) {
                    navLabel.textContent = '로그인';
                }
            }
        }

        // Set active class based on current page
        if (bottomNavAuthLink) {
            const currentPath = window.location.pathname.split('/').pop();
            if (user && currentPath === 'mypage.html') {
                bottomNavAuthLink.classList.add('active');
            } else if (!user && currentPath === 'login.html') {
                bottomNavAuthLink.classList.add('active');
            } else {
                bottomNavAuthLink.classList.remove('active');
            }
        }
    });
});
