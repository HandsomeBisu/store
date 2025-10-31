document.addEventListener('DOMContentLoaded', async () => {
    const productDetailContainer = document.getElementById('product-detail-container');
    let currentUser = null;

    // URL에서 상품 ID 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        productDetailContainer.innerHTML = '<p>상품 정보를 찾을 수 없습니다.</p>';
        return;
    }

    // 사용자 로그인 상태 감지
    auth.onAuthStateChanged(user => {
        currentUser = user;
    });

    try {
        // Firestore에서 상품 정보 가져오기
        const doc = await db.collection('products').doc(productId).get();

        if (!doc.exists) {
            productDetailContainer.innerHTML = '<p>상품이 존재하지 않습니다.</p>';
            return;
        }

        const product = { id: doc.id, ...doc.data() };

        // 상품 상세 정보 렌더링
        renderProductDetails(product);

    } catch (error) {
        console.error('상품 정보를 불러오는 중 오류 발생:', error);
        productDetailContainer.innerHTML = '<p>상품 정보를 불러오는 데 실패했습니다.</p>';
    }

    function renderProductDetails(product) {
        productDetailContainer.innerHTML = `
            <div class="product-main-section">
                <div class="product-detail-image">
                    <img src="${product.colors[0].image}" alt="${product.name}" id="main-product-image">
                </div>
                <div class="product-detail-info">
                    <h1 class="product-title">${product.name}</h1>
                    <p class="product-price">₩${product.price.toLocaleString()}</p>
                    
                    <div class="product-options">
                        <div class="option-group">
                            <label for="color-select">색상:</label>
                            <div class="select-wrapper">
                                <select id="color-select">
                                    ${product.colors.map(color => `<option value="${color.name}" data-image="${color.image}">${color.name}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="option-group">
                            <label for="size-select">사이즈:</label>
                            <div class="select-wrapper">
                                <select id="size-select">
                                    ${product.sizes.map(size => `<option value="${size}">${size}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="product-actions-group">
                        <button class="btn add-to-cart-btn" id="add-to-cart">장바구니에 추가</button>
                        <button class="btn buy-now-btn" id="buy-now">바로 구매</button>
                    </div>
                </div>
            </div>
            <div class="product-full-description">
                ${marked.parse(product.description)}
            </div>
        `;

        const mainProductImage = document.getElementById('main-product-image');
        const colorSelect = document.getElementById('color-select');
        const addToCartBtn = document.getElementById('add-to-cart');
        const buyNowBtn = document.getElementById('buy-now');

        // 색상 변경 시 이미지 업데이트
        colorSelect.addEventListener('change', (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            mainProductImage.src = selectedOption.dataset.image;
        });

        // 장바구니 추가 버튼 이벤트
        addToCartBtn.addEventListener('click', () => {
            if (currentUser) {
                const selectedColor = colorSelect.value;
                const selectedSize = document.getElementById('size-select').value;
                addToCart(currentUser.uid, product.id, selectedColor, selectedSize);
            } else {
                alert('장바구니에 상품을 추가하려면 먼저 로그인해주세요.');
            }
        });

        // 바로 구매 버튼 이벤트
        buyNowBtn.addEventListener('click', async () => {
            if (currentUser) {
                const selectedColor = colorSelect.value;
                const selectedSize = document.getElementById('size-select').value;
                await addToCart(currentUser.uid, product.id, selectedColor, selectedSize);
                window.location.href = 'cart.html'; // 장바구니 페이지로 이동
            } else {
                alert('상품을 구매하려면 먼저 로그인해주세요.');
            }
        });
    }

    async function addToCart(userId, productId, color, size) {
        const cartRef = db.collection('carts').doc(userId);
        const doc = await cartRef.get();
        const newItem = { productId, color, size, quantity: 1 };

        if (doc.exists) {
            const currentItems = doc.data().items || [];
            const itemIndex = currentItems.findIndex(item => item.productId === productId && item.color === color && item.size === size);

            if (itemIndex > -1) {
                currentItems[itemIndex].quantity += 1;
            } else {
                currentItems.push(newItem);
            }
            await cartRef.update({ items: currentItems });
        } else {
            await cartRef.set({ items: [newItem] });
        }
        alert('장바구니에 상품이 추가되었습니다.');
        // 장바구니 페이지로 이동하거나, 카운트만 업데이트 할 수 있습니다.
        // window.location.href = 'cart.html'; 
    }
});
