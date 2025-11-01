document.addEventListener('DOMContentLoaded', async () => {
    const productDetailContainer = document.getElementById('product-detail-container');
    let currentUser = null;

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        productDetailContainer.innerHTML = '<p>상품 정보를 찾을 수 없습니다.</p>';
        return;
    }

    auth.onAuthStateChanged(user => {
        currentUser = user;
    });

    try {
        const doc = await db.collection('products').doc(productId).get();
        if (!doc.exists) {
            productDetailContainer.innerHTML = '<p>상품이 존재하지 않습니다.</p>';
            return;
        }
        const product = { id: doc.id, ...doc.data() };
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

        colorSelect.addEventListener('change', (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            mainProductImage.src = selectedOption.dataset.image;
        });

        addToCartBtn.addEventListener('click', () => {
            if (currentUser) {
                const selectedColor = colorSelect.value;
                const selectedSize = document.getElementById('size-select').value;
                addToCart(product, selectedColor, selectedSize);
            } else {
                alert('로그인이 필요합니다.');
            }
        });

        buyNowBtn.addEventListener('click', () => {
            if (currentUser) {
                const selectedColor = colorSelect.value;
                const selectedSize = document.getElementById('size-select').value;
                buyNow(product, selectedColor, selectedSize);
            } else {
                alert('로그인이 필요합니다.');
            }
        });
    }

    function addToCart(product, color, size) {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        const itemIndex = cart.findIndex(item => item.id === product.id && item.color === color && item.size === size);

        if (itemIndex > -1) {
            cart[itemIndex].quantity++;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                color: color,
                size: size,
                image: product.colors.find(c => c.name === color).image,
                quantity: 1
            });
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        alert('장바구니에 상품이 추가되었습니다.');
    }

    function buyNow(product, color, size) {
        const buyNowItem = {
            id: product.id,
            name: product.name,
            price: product.price,
            color: color,
            size: size,
            image: product.colors.find(c => c.name === color).image,
            quantity: 1
        };
        sessionStorage.setItem('buyNowItem', JSON.stringify(buyNowItem));
        window.location.href = 'payment.html';
    }
});