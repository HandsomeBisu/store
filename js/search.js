import { db } from './firebase.js';
import { collection, query, getDocs } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async () => {
    const productList = document.getElementById('product-list');
    const searchQueryDisplay = document.getElementById('search-query-display');
    const noResultsMessage = document.getElementById('no-results-message');

    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('query');

    if (searchQuery) {
        searchQueryDisplay.textContent = `"${decodeURIComponent(searchQuery)}" 검색 결과`;
        await fetchSearchResults(searchQuery);
    } else {
        searchQueryDisplay.textContent = '전체 상품';
        await fetchSearchResults(''); // Fetch all products if no query
    }

    async function fetchSearchResults(queryText) {
        productList.innerHTML = '<p>검색 중...</p>';
        noResultsMessage.style.display = 'none';
        let products = [];

        try {
            const productsRef = collection(db, 'products');
            const q = query(productsRef);
            const querySnapshot = await getDocs(q);

            querySnapshot.forEach(doc => {
                const product = { id: doc.id, ...doc.data() };
                // Simple case-insensitive search on product name
                if (queryText === '' || product.name.toLowerCase().includes(queryText.toLowerCase())) {
                    products.push(product);
                }
            });

            if (products.length > 0) {
                productList.innerHTML = '';
                products.forEach(product => {
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

                // Re-initialize product sliders for search results
                initializeProductSliders();

            } else {
                productList.innerHTML = '';
                noResultsMessage.style.display = 'block';
            }

        } catch (error) {
            console.error("Error fetching search results: ", error);
            productList.innerHTML = '<p>검색 결과를 불러오는 데 실패했습니다.</p>';
        }
    }

    // This function is duplicated from main.js for now, consider refactoring into a common utility
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
                // Note: productSlidersIntervals is not defined here, this will need to be handled if search.js is standalone
            }
        });
    }
});