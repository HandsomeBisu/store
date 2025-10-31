document.addEventListener('DOMContentLoaded', () => {
    const cartContainer = document.getElementById('cart-container');
    const cartTotalPrice = document.getElementById('cart-total-price');
    const cartEmptyMessage = document.getElementById('cart-empty-message');
    const authContainer = document.getElementById('auth-container');
    const cartCountElements = document.querySelectorAll('.cart-count');

    let currentUser = null;

    // 사용자 로그인 상태 감지
    auth.onAuthStateChanged(user => {
        currentUser = user;
        updateAuthUI(user);
        if (user) {
            loadCartItems(user.uid);
        } else {
            cartContainer.innerHTML = '';
            cartEmptyMessage.style.display = 'block';
            updateCartTotal(0);
            updateCartCount(0);
        }
    });

    // 로그인/로그아웃 UI 업데이트
    function updateAuthUI(user) {
        if (user) {
            authContainer.innerHTML = `<button id="logout-btn" class="btn btn-secondary">로그아웃</button>`;
            document.getElementById('logout-btn').addEventListener('click', () => {
                auth.signOut();
            });
        } else {
            authContainer.innerHTML = `<button id="login-btn" class="btn">Google 로그인</button>`;
            document.getElementById('login-btn').addEventListener('click', () => {
                const provider = new firebase.auth.GoogleAuthProvider();
                auth.signInWithPopup(provider);
            });
        }
    }

    // Firestore에서 장바구니 아이템 로드
    async function loadCartItems(userId) {
        const cartRef = db.collection('carts').doc(userId);
        const doc = await cartRef.get();

        if (doc.exists && doc.data().items) {
            const cartItems = doc.data().items;
            renderCartItems(cartItems);
            if (cartItems.length === 0) {
                cartEmptyMessage.style.display = 'block';
            } else {
                cartEmptyMessage.style.display = 'none';
            }
        } else {
            cartContainer.innerHTML = '';
            cartEmptyMessage.style.display = 'block';
            updateCartTotal(0);
            updateCartCount(0);
        }
    }

    // 장바구니 아이템을 화면에 렌더링
    function renderCartItems(items) {
        cartContainer.innerHTML = '';
        let total = 0;
        let totalCount = 0;

        if (items.length === 0) {
            cartEmptyMessage.style.display = 'block';
        } else {
            cartEmptyMessage.style.display = 'none';
            items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    const itemElement = document.createElement('div');
                    itemElement.className = 'cart-item';
                    itemElement.innerHTML = `
                        <img src="${product.image}" alt="${product.name}" class="cart-item-image">
                        <div class="cart-item-info">
                            <h4>${product.name}</h4>
                            <p>₩${product.price.toLocaleString()}</p>
                        </div>
                        <div class="cart-item-quantity">
                            <button class="quantity-btn" data-id="${product.id}" data-change="-1">-</button>
                            <span>${item.quantity}</span>
                            <button class="quantity-btn" data-id="${product.id}" data-change="1">+</button>
                        </div>
                        <button class="remove-from-cart-btn" data-id="${product.id}">&times;</button>
                    `;
                    cartContainer.appendChild(itemElement);
                    total += product.price * item.quantity;
                    totalCount += item.quantity;
                }
            });
        }

        updateCartTotal(total);
        updateCartCount(totalCount);
        addCartEventListeners();
    }

    // 장바구니 총액 업데이트
    function updateCartTotal(total) {
        cartTotalPrice.textContent = total.toLocaleString();
    }

    // 장바구니 아이콘 카운트 업데이트
    function updateCartCount(count) {
        cartCountElements.forEach(el => el.textContent = count);
    }

    // 장바구니 아이템 이벤트 리스너 추가
    function addCartEventListeners() {
        // 아이템 삭제
        document.querySelectorAll('.remove-from-cart-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = e.target.dataset.id;
                removeItemFromCart(productId);
            });
        });

        // 수량 변경
        document.querySelectorAll('.quantity-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = e.target.dataset.id;
                const change = parseInt(e.target.dataset.change, 10);
                updateItemQuantity(productId, change);
            });
        });
    }

    // Firestore에서 아이템 삭제
    async function removeItemFromCart(productId) {
        if (!currentUser) return;
        const cartRef = db.collection('carts').doc(currentUser.uid);
        const doc = await cartRef.get();
        if (doc.exists) {
            const currentItems = doc.data().items || [];
            const newItems = currentItems.filter(item => item.productId !== productId);
            await cartRef.update({ items: newItems });
            loadCartItems(currentUser.uid);
        }
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

    // Firestore에서 아이템 수량 업데이트
    async function updateItemQuantity(productId, change) {
        if (!currentUser) return;
        const cartRef = db.collection('carts').doc(currentUser.uid);
        const doc = await cartRef.get();
        if (doc.exists) {
            const currentItems = doc.data().items || [];
            const itemIndex = currentItems.findIndex(item => item.productId === productId);
            if (itemIndex > -1) {
                currentItems[itemIndex].quantity += change;
                if (currentItems[itemIndex].quantity <= 0) {
                    // 수량이 0 이하면 아이템 삭제
                    currentItems.splice(itemIndex, 1);
                }
            }
            await cartRef.update({ items: currentItems });
            loadCartItems(currentUser.uid);
        }
    }
});
