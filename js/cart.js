import { auth } from './firebase.js';
import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const cartContainer = document.getElementById('cart-container');
    const cartTotalPrice = document.getElementById('cart-total-price');
    const cartEmptyMessage = document.getElementById('cart-empty-message');
    const authContainer = document.getElementById('auth-container');
    const checkoutBtn = document.getElementById('checkout-btn');

    let currentUser = null;

    // 사용자 로그인 상태 감지
    auth.onAuthStateChanged(user => {
        currentUser = user;
        updateAuthUI(user);
        if (user) {
            loadCartItems();
        } else {
            window.location.href = 'login.html';
        }
    });

    // 로그인/로그아웃 UI 업데이트
    function updateAuthUI(user) {
        if (user) {
            authContainer.innerHTML = `
                <span class="user-display-name">${user.displayName || 'User'}</span>
                <button id="logout-btn" class="btn btn-secondary">로그아웃</button>
            `;
            document.getElementById('logout-btn').addEventListener('click', () => {
                auth.signOut();
            });
        } else {
            authContainer.innerHTML = `<a href="login.html" id="login-btn" class="btn">로그인</a>`;
        }
    }

    // 로컬 스토리지에서 장바구니 아이템 로드
    function loadCartItems() {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        renderCartItems(cart);
    }

    // 장바구니 아이템을 화면에 렌더링
    function renderCartItems(cart) {
        cartContainer.innerHTML = '';
        let total = 0;

        if (cart.length === 0) {
            cartEmptyMessage.style.display = 'block';
            checkoutBtn.classList.add('disabled');
            checkoutBtn.href = '#';
        } else {
            cartEmptyMessage.style.display = 'none';
            checkoutBtn.classList.remove('disabled');
            checkoutBtn.href = 'payment.html';
            cart.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.className = 'cart-item';
                itemElement.innerHTML = `
                    <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <p>₩${item.price.toLocaleString()}</p>
                        <p>색상: ${item.color}, 사이즈: ${item.size}</p>
                    </div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn" data-id="${item.id}" data-color="${item.color}" data-size="${item.size}" data-change="-1">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn" data-id="${item.id}" data-color="${item.color}" data-size="${item.size}" data-change="1">+</button>
                    </div>
                    <button class="remove-from-cart-btn" data-id="${item.id}" data-color="${item.color}" data-size="${item.size}">&times;</button>
                `;
                cartContainer.appendChild(itemElement);
                total += item.price * item.quantity;
            });
        }

        updateCartTotal(total);
        addCartEventListeners();
    }

    // 장바구니 총액 업데이트
    function updateCartTotal(total) {
        cartTotalPrice.textContent = total.toLocaleString();
    }

    // 장바구니 아이템 이벤트 리스너 추가
    function addCartEventListeners() {
        document.querySelectorAll('.remove-from-cart-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const { id, color, size } = e.target.dataset;
                removeItemFromCart(id, color, size);
            });
        });

        document.querySelectorAll('.quantity-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const { id, color, size, change } = e.target.dataset;
                updateItemQuantity(id, color, size, parseInt(change, 10));
            });
        });
    }

    // 로컬 스토리지에서 아이템 삭제
    function removeItemFromCart(productId, color, size) {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        const updatedCart = cart.filter(item => !(item.id === productId && item.color === color && item.size === size));
        localStorage.setItem('cart', JSON.stringify(updatedCart));
        loadCartItems();
    }

    // 로컬 스토리지에서 아이템 수량 업데이트
    function updateItemQuantity(productId, color, size, change) {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        const itemIndex = cart.findIndex(item => item.id === productId && item.color === color && item.size === size);

        if (itemIndex > -1) {
            cart[itemIndex].quantity += change;
            if (cart[itemIndex].quantity <= 0) {
                cart.splice(itemIndex, 1);
            }
        }

        localStorage.setItem('cart', JSON.stringify(cart));
        loadCartItems();
    }

    // 모바일 장바구니 헤더 뒤로가기 버튼 이벤트
    const mobileCartHeader = document.querySelector('.mobile-cart-header');
    if (mobileCartHeader) {
        const backButton = mobileCartHeader.querySelector('.back-button');
        if (backButton) {
            backButton.addEventListener('click', (e) => {
                e.preventDefault();
                history.back();
            });
        }
    }

    // 초기 로드
    loadCartItems();

    checkoutBtn.addEventListener('click', (e) => {
        if (checkoutBtn.classList.contains('disabled')) {
            e.preventDefault();
            alert('장바구니가 비어 있습니다.');
        }
    });
});
