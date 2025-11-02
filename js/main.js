import { auth, db } from './firebase.js';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const productList = document.getElementById('product-list');
    const authContainer = document.getElementById('auth-container');
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const navLinks = document.getElementById('nav-links');

    let currentUser = null;

    // 햄버거 메뉴 토글
    if (hamburgerMenu) {
        hamburgerMenu.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // 사용자 로그인 상태 감지
    auth.onAuthStateChanged(user => {
        currentUser = user;
        updateAuthUI(user);
    });

    // 로그인/로그아웃 UI 업데이트
    function updateAuthUI(user) {
        if (user) {
            authContainer.innerHTML = `
                <span class="user-display-name">${user.displayName || 'User'}</span>
                <button id="logout-btn" class="btn btn-secondary">로그아웃</button>
            `;
            document.getElementById('logout-btn').addEventListener('click', () => {
                auth.signOut().then(() => {
                    localStorage.removeItem('cart'); // 로그아웃 시 로컬 스토리지 장바구니 비우기
                });
            });
        } else {
            authContainer.innerHTML = `<a href="login.html" id="login-btn" class="btn">로그인</a>`;
        }
    }

    let productSlidersIntervals = [];

    // 상품 목록 렌더링
    function renderProducts() {
        if (!productList) return;
        productList.innerHTML = '<p>상품을 불러오는 중...</p>';
        
        const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
        onSnapshot(q, snapshot => {
            productSlidersIntervals.forEach(clearInterval);
            productSlidersIntervals = [];

            if (snapshot.empty) {
                productList.innerHTML = '<p>등록된 상품이 없습니다.</p>';
                return;
            }

            productList.innerHTML = '';
            snapshot.forEach(doc => {
                const product = { id: doc.id, ...doc.data() };
                const productCard = document.createElement('div');
                productCard.className = 'product-card';
                productCard.dataset.productId = product.id;

                const images = product.colors.map(color => color.image);

                productCard.innerHTML = `
                    <div class="product-image-container">
                        <div class="image-slider-wrapper">
                            ${images.map(img => `<img src="${img}" alt="${product.name}" class="product-image">`).join('')}
                        </div>
                        <div class="product-actions">
                            <button class="btn add-to-cart-btn" data-id="${product.id}">장바구니 추가</button>
                        </div>
                    </div>
                    <div class="product-info">
                        <h3 class="product-name">${product.name}</h3>
                        <p class="product-price">₩${(product.price || (product.sizes && product.sizes[0] ? product.sizes[0].price : 0)).toLocaleString()}</p>
                    </div>
                `;
                productList.appendChild(productCard);
            });

            document.querySelectorAll('.product-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (e.target.closest('button')) return;
                    window.location.href = `product-detail.html?id=${card.dataset.productId}`;
                });
            });

            initializeProductSliders();
            bindProductActionButtons();

        }, error => {
            console.error("상품 로딩 중 에러 발생: ", error);
            productList.innerHTML = '<p>상품을 불러오는 데 실패했습니다.</p>';
        });
    }

    function initializeProductSliders() {
        document.querySelectorAll('.product-image-container').forEach(container => {
                const sliderWrapper = container.querySelector('.image-slider-wrapper');
                if (!sliderWrapper) return;

                const images = sliderWrapper.querySelectorAll('.product-image');
                const numImages = images.length;

                if (numImages > 1) {
                    const firstImageClone = images[0].cloneNode(true);
                    sliderWrapper.appendChild(firstImageClone);

                    let currentIndex = 0;
                    const intervalId = setInterval(() => {
                        currentIndex++;
                        sliderWrapper.style.transition = 'transform 0.5s ease-in-out';
                        sliderWrapper.style.transform = `translateX(-${currentIndex * 100}%)`;

                        if (currentIndex === numImages) {
                            setTimeout(() => {
                                sliderWrapper.style.transition = 'none';
                                currentIndex = 0;
                                sliderWrapper.style.transform = 'translateX(0%)';
                            }, 500);
                        }
                    }, 2000);
                    productSlidersIntervals.push(intervalId);
                }
            });
        }

    function bindProductActionButtons() {
        document.querySelectorAll('.add-to-cart-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                if (currentUser) {
                    const productId = e.target.dataset.id;
                    // 기본 옵션으로 장바구니에 추가
                    addProductToCartById(productId);
                } else {
                    alert('로그인이 필요합니다.');
                }
            });
        });
    }

    async function addProductToCartById(productId) {
        const productRef = doc(db, 'products', productId);
        const docSnap = await getDoc(productRef);
        if (docSnap.exists()) {
            const product = { id: docSnap.id, ...docSnap.data() };
            // 기본 옵션 (첫 번째 색상, 첫 번째 사이즈)으로 추가
            const defaultColor = product.colors[0];
            const defaultSize = product.sizes[0];

            let cart = JSON.parse(localStorage.getItem('cart')) || [];
            const itemIndex = cart.findIndex(item => item.id === productId && item.color === defaultColor.name && item.size === defaultSize.name);

            if (itemIndex > -1) {
                cart[itemIndex].quantity++;
            } else {
                cart.push({
                    id: product.id,
                    name: product.name,
                    price: defaultSize.price, // 사이즈별 가격 적용
                    color: defaultColor.name,
                    size: defaultSize.name,
                    image: defaultColor.image,
                    quantity: 1
                });
            }
            localStorage.setItem('cart', JSON.stringify(cart));
            alert('장바구니에 상품이 추가되었습니다.');
        }
    }


    renderProducts();
});