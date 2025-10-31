document.addEventListener('DOMContentLoaded', () => {
    const productList = document.getElementById('product-list');
    const authContainer = document.getElementById('auth-container');
    const cartCountElements = document.querySelectorAll('.cart-count');
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const navLinks = document.getElementById('nav-links');

    let currentUser = null;

    // 햄버거 메뉴 토글
    hamburgerMenu.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    // 사용자 로그인 상태 감지
    auth.onAuthStateChanged(user => {
        currentUser = user;
        updateAuthUI(user);
        if (user) {
            // 로그인 시 사용자의 장바구니 정보 실시간 감지
            listenToCartChanges(user.uid);
        } else {
            // 로그아웃 시 장바구니 카운트 초기화
            updateCartCount(0);
        }
    });

    // 로그인/로그아웃 UI 업데이트
    function updateAuthUI(user) {
        if (user) {
            // 로그인 상태: 사용자 이름과 로그아웃 버튼 표시
            authContainer.innerHTML = `
                <span class="user-display-name">${user.displayName || 'User'}</span>
                <button id="logout-btn" class="btn btn-secondary">로그아웃</button>
            `;
            document.getElementById('logout-btn').addEventListener('click', () => {
                auth.signOut().then(() => console.log('로그아웃 성공'));
            });
        } else {
            // 로그아웃 상태: 로그인 버튼 표시
            authContainer.innerHTML = `<button id="login-btn" class="btn">Google 로그인</button>`;
            document.getElementById('login-btn').addEventListener('click', () => {
                const provider = new firebase.auth.GoogleAuthProvider();
                auth.signInWithPopup(provider).catch(error => console.error('로그인 에러:', error));
            });
        }
    }

    // Firestore의 장바구니 변경사항을 실시간으로 감지
    function listenToCartChanges(userId) {
        db.collection('carts').doc(userId).onSnapshot(doc => {
            if (doc.exists) {
                const items = doc.data().items || [];
                const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
                updateCartCount(totalCount);
            } else {
                updateCartCount(0);
            }
        });
    }

    // 장바구니 아이콘 카운트 업데이트
    function updateCartCount(count) {
        cartCountElements.forEach(el => el.textContent = count);
    }

    let productSlidersIntervals = []; // 슬라이더 인터벌 ID를 저장할 배열

    // 상품 목록 렌더링 (Firestore에서 실시간으로 가져오기)
    function renderProducts() {
        productList.innerHTML = '<p>상품을 불러오는 중...</p>';
        
        db.collection('products').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            // 기존 인터벌 클리어
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
                            <button class="btn buy-now-btn" data-id="${product.id}">바로 구매</button>
                        </div>
                    </div>
                    <div class="product-info">
                        <h3 class="product-name">${product.name}</h3>
                        <p class="product-price">₩${product.price.toLocaleString()}</p>
                    </div>
                `;
                productList.appendChild(productCard);
            });

            // 상품 카드 클릭 시 상세 페이지로 이동
            document.querySelectorAll('.product-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (e.target.closest('button')) return;
                    const productId = card.dataset.productId;
                    window.location.href = `product-detail.html?id=${productId}`;
                });
            });

            initializeProductSliders(); // 슬라이더 초기화
            bindProductActionButtons();

        }, error => {
            console.error("상품 로딩 중 에러 발생: ", error);
            productList.innerHTML = '<p>상품을 불러오는 데 실패했습니다.</p>';
        });
    }

    // 상품 이미지 슬라이더 초기화 (무한 루프)
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


    // 상품 카드 내 버튼들의 이벤트 리스너를 바인딩하는 함수
    function bindProductActionButtons() {
        // '장바구니에 추가' 버튼 이벤트 리스너
        document.querySelectorAll('.add-to-cart-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // 이벤트 버블링 방지
                if (currentUser) {
                    const productId = e.target.dataset.id;
                    addToCart(currentUser.uid, productId);
                } else {
                    alert('장바구니에 상품을 추가하려면 먼저 로그인해주세요.');
                }
            });
        });

        // '바로 구매' 버튼 이벤트 리스너
        document.querySelectorAll('.buy-now-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation(); // 이벤트 버블링 방지
                if (currentUser) {
                    const productId = e.target.dataset.id;
                    await addToCart(currentUser.uid, productId);
                    window.location.href = 'cart.html'; // 장바구니 페이지로 이동
                } else {
                    alert('상품을 구매하려면 먼저 로그인해주세요.');
                }
            });
        });
    }

    // Firestore에 장바구니 아이템 추가/업데이트
    async function addToCart(userId, productId) {
        const cartRef = db.collection('carts').doc(userId);
        const doc = await cartRef.get();

        if (doc.exists) {
            // 장바구니 문서가 존재할 경우
            const currentItems = doc.data().items || [];
            const itemIndex = currentItems.findIndex(item => item.productId === productId);

            if (itemIndex > -1) {
                // 이미 있는 상품이면 수량 증가
                currentItems[itemIndex].quantity += 1;
            } else {
                // 없는 상품이면 새로 추가
                currentItems.push({ productId: productId, quantity: 1 });
            }
            await cartRef.update({ items: currentItems });
        } else {
            // 장바구니 문서가 없으면 새로 생성
            await cartRef.set({ items: [{ productId: productId, quantity: 1 }] });
        }
        console.log(`상품(ID: ${productId})이 장바구니에 추가되었습니다.`);
    }

    // 초기 상품 렌더링
    renderProducts();
});
