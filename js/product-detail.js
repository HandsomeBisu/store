import { auth, db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

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
        const productRef = doc(db, 'products', productId);
        const docSnap = await getDoc(productRef);
        if (!docSnap.exists()) {
            productDetailContainer.innerHTML = '<p>상품이 존재하지 않습니다.</p>';
            return;
        }
        const product = { id: docSnap.id, ...docSnap.data() };
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
                    <p class="product-price">₩${(product.sizes && product.sizes[0] ? product.sizes[0].price : 0).toLocaleString()}</p>
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
                                    ${product.sizes.map(size => `<option value="${size.name}" data-price="${size.price}">${size.name}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="product-actions-group">
                        <button class="btn add-to-cart-btn" id="add-to-cart">장바구니에 추가</button>
                        <button class="btn buy-now-btn" id="buy-now">바로 구매</button>
                    </div>
                    <div class="warning-message">
                        판매자가 현금 거래 및 다른 결제 방법을 유도할 경우 고객센터에 신고해주세요.
                    </div>
                </div>
            </div>
            <div class="product-full-description">
                ${marked.parse(product.description)}
            </div>
        `;

        const mainProductImage = document.getElementById('main-product-image');
        const colorSelect = document.getElementById('color-select');
        const sizeSelect = document.getElementById('size-select');
        const productPriceEl = document.querySelector('.product-price');
        const addToCartBtn = document.getElementById('add-to-cart');
        const buyNowBtn = document.getElementById('buy-now');

        colorSelect.addEventListener('change', (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            mainProductImage.src = selectedOption.dataset.image;
        });

        sizeSelect.addEventListener('change', (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            const newPrice = parseFloat(selectedOption.dataset.price);
            productPriceEl.textContent = `₩${newPrice.toLocaleString()}`;
        });

        addToCartBtn.addEventListener('click', () => {
            if (currentUser) {
                const selectedColor = colorSelect.value;
                const selectedSize = document.getElementById('size-select').value;
                addToCart(product, selectedColor, selectedSize);
            } else {
                window.location.href = 'login.html';
            }
        });

        buyNowBtn.addEventListener('click', () => {
            if (currentUser) {
                const selectedColor = colorSelect.value;
                const selectedSize = document.getElementById('size-select').value;
                buyNow(product, selectedColor, selectedSize);
            } else {
                window.location.href = 'login.html';
            }
        });
    }

    function addToCart(product, color, selectedSizeName) {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        const itemIndex = cart.findIndex(item => item.id === product.id && item.color === color && item.size === selectedSizeName);

        const sizeSelect = document.getElementById('size-select');
        const selectedSizeOption = sizeSelect.options[sizeSelect.selectedIndex];
        const selectedSizePrice = parseFloat(selectedSizeOption.dataset.price);

        if (itemIndex > -1) {
            cart[itemIndex].quantity++;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: selectedSizePrice, // 선택된 사이즈의 가격 적용
                color: color,
                size: selectedSizeName, // 사이즈 이름 적용
                image: product.colors.find(c => c.name === color).image,
                quantity: 1
            });
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        alert('장바구니에 상품이 추가되었습니다.');
    }

    function buyNow(product, color, selectedSizeName) {
        const sizeSelect = document.getElementById('size-select');
        const selectedSizeOption = sizeSelect.options[sizeSelect.selectedIndex];
        const selectedSizePrice = parseFloat(selectedSizeOption.dataset.price);

        const buyNowItem = {
            id: product.id,
            name: product.name,
            price: selectedSizePrice, // 선택된 사이즈의 가격 적용
            color: color,
            size: selectedSizeName, // 사이즈 이름 적용
            image: product.colors.find(c => c.name === color).image,
            quantity: 1
        };
        sessionStorage.setItem('buyNowItem', JSON.stringify(buyNowItem));
        window.location.href = 'payment.html';
    }
});