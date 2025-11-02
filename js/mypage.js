import { auth, db } from './firebase.js';
import { collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const orderList = document.getElementById('order-list');
    const authContainer = document.getElementById('auth-container');
    let currentUser = null;

    // Function to update auth UI
    function updateAuthUI(user) {
        if (user) {
            authContainer.innerHTML = `<span class="user-display-name">${user.displayName || 'User'}</span><button id="logout-btn" class="btn btn-secondary">로그아웃</button>`;
            document.getElementById('logout-btn').addEventListener('click', () => {
                auth.signOut().then(() => {
                    window.location.href = 'index.html';
                });
            });
        } else {
            authContainer.innerHTML = `<a href="login.html" class="btn">로그인</a>`;
        }
    }

    // Listen for auth state changes
    auth.onAuthStateChanged(user => {
        currentUser = user;
        updateAuthUI(user);
        const userGreeting = document.getElementById('user-greeting');
        if (user) {
            if (userGreeting) {
                userGreeting.textContent = `안녕하세요 ${user.displayName || '회원'}님`;
            }
            loadUserOrders(user.uid);
        } else {
            window.location.href = 'login.html';
        }
    });

    // Function to load user orders from Firestore
    async function loadUserOrders(userId) {
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));

        try {
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                orderList.innerHTML = '<p>주문 내역이 없습니다.</p>';
                return;
            }

            let ordersHTML = '';
            snapshot.forEach(doc => {
                const orderData = doc.data();
                const orderId = doc.id;
                const orderDate = orderData.createdAt.toDate().toLocaleDateString();
                const itemsHTML = orderData.items.map(item => `<li>${item.name} (색상: ${item.color}, 사이즈: ${item.size}) - ${item.quantity}개</li>`).join('');

                ordersHTML += `
                    <div class="order-card">
                        <div class="order-header">
                            <h3>주문번호: ${orderId}</h3>
                            <span>주문일: ${orderDate}</span>
                        </div>
                        <div class="order-body">
                            <p><strong>총 결제 금액:</strong> ₩${orderData.total.toLocaleString()}</p>
                            <p><strong>주문 상태:</strong> ${orderData.status}</p>
                            <ul>
                                ${itemsHTML}
                            </ul>
                        </div>
                    </div>
                `;
            });

            orderList.innerHTML = ordersHTML;
        } catch (error) {
            console.error("Error fetching orders: ", error);
            orderList.innerHTML = '<p>주문 내역을 불러오는 중 오류가 발생했습니다.</p>';
        }
    }

    // 모바일 마이페이지 헤더 뒤로가기 버튼 이벤트
    const mobileMyPageHeader = document.querySelector('.mobile-cart-header');
    if (mobileMyPageHeader) {
        const backButton = mobileMyPageHeader.querySelector('.back-button');
        if (backButton) {
            backButton.addEventListener('click', (e) => {
                e.preventDefault();
                history.back();
            });
        }
    }
});
