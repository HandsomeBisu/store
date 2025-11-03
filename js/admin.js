import { db } from './firebase.js';
import { onAuthChange } from './auth.js';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const ADMIN_UID = '6QEjtptLkwVeFOQB3cOjU12yvAA3';

document.addEventListener('DOMContentLoaded', () => {
    onAuthChange(user => {
        if (user && user.uid === ADMIN_UID) {
            // 사용자가 어드민일 경우, 관리자 페이지 기능 초기화
            initializeAdminPage();
        } else {
            // 어드민이 아닐 경우, 홈페이지로 리디렉션
            alert('접근 권한이 없습니다.');
            window.location.href = 'index.html';
        }
    });
});

function initializeAdminPage() {
    const addProductForm = document.getElementById('add-product-form');
    const submitButton = document.getElementById('submit-product');
    const uploadStatus = document.getElementById('upload-status');
    const colorOptionsContainer = document.getElementById('color-options-container');
    const addColorOptionBtn = document.getElementById('add-color-option');
    const sizeOptionsContainer = document.getElementById('size-options-container');
    const addSizeOptionBtn = document.getElementById('add-size-option');

    let editMode = false;
    let currentProductId = null;

    // Category management
    const adminCategoryButtons = document.querySelectorAll('.admin-category-btn');
    const adminSections = document.querySelectorAll('.admin-section');

    function showCategory(category) {
        adminSections.forEach(section => {
            section.style.display = 'none';
        });
        document.getElementById(`${category}-section`).style.display = 'block';

        adminCategoryButtons.forEach(button => {
            button.classList.remove('active');
        });
        document.querySelector(`.admin-category-btn[data-category="${category}"]`).classList.add('active');

        // Render content for the selected category
        if (category === 'product-management') {
            renderAdminProducts();
        } else if (category === 'coupon-management') {
            renderCoupons();
        } else if (category === 'order-management') {
            renderOrders();
        }
    }

    adminCategoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            showCategory(button.dataset.category);
        });
    });

    // Initial display
    showCategory('product-management');


    // 색상 옵션 추가
    addColorOptionBtn.addEventListener('click', () => {
        const newColorOption = document.createElement('div');
        newColorOption.classList.add('color-option');
        newColorOption.innerHTML = `
            <input type="text" placeholder="색상명" class="product-color" required>
            <input type="file" class="color-image" accept="image/*" required>
            <button type="button" class="remove-option-btn">삭제</button>
        `;
        colorOptionsContainer.appendChild(newColorOption);
    });

    // 사이즈 옵션 추가
    addSizeOptionBtn.addEventListener('click', () => {
        const newSizeOption = document.createElement('div');
        newSizeOption.classList.add('size-option');
        newSizeOption.innerHTML = `
            <input type="text" placeholder="사이즈" class="product-size" required>
            <input type="number" placeholder="가격" class="product-size-price" required>
            <button type="button" class="remove-option-btn">삭제</button>
        `;
        sizeOptionsContainer.appendChild(newSizeOption);
    });

    // 삭제 버튼 이벤트 처리 (동적 생성 요소)
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-option-btn')) {
            e.target.parentElement.remove();
        }
    });

    // 폼 제출 이벤트 처리 (상품 추가 또는 수정)
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const productName = document.getElementById('product-name').value;
        const productDescription = document.getElementById('product-description').value;
        const colorOptions = colorOptionsContainer.querySelectorAll('.color-option');
        const sizeOptions = sizeOptionsContainer.querySelectorAll('.size-option');

        const sizes = Array.from(sizeOptions).map(opt => {
            const name = opt.querySelector('.product-size').value;
            const price = parseFloat(opt.querySelector('.product-size-price').value);
            return { name, price };
        }).filter(s => s.name && !isNaN(s.price));

        if (!productName || sizes.length === 0 || colorOptions.length === 0) {
            alert('상품명, 색상, 사이즈 및 가격은 필수 항목입니다.');
            return;
        }

        uploadStatus.textContent = '업로드 중...';

        try {
            const colors = [];
            for (const option of colorOptions) {
                const colorName = option.querySelector('.product-color').value;
                const imageFile = option.querySelector('.color-image').files[0];
                const existingImageUrl = option.dataset.existingImage;

                if (!colorName) {
                    alert('모든 색상명을 입력해주세요.');
                    uploadStatus.textContent = '';
                    return;
                }

                if (imageFile) { // 새 이미지가 첨부된 경우에만 업로드
                    const formData = new FormData();
                    formData.append('file', imageFile);
                    formData.append('upload_preset', 'dpflsite');
                    const res = await fetch('https://api.cloudinary.com/v1_1/dfckxxocs/image/upload', {
                        method: 'POST',
                        body: formData
                    });
                    const data = await res.json();
                    colors.push({ name: colorName, image: data.secure_url });
                } else if (existingImageUrl) { // 기존 이미지가 있는 경우
                    colors.push({ name: colorName, image: existingImageUrl });
                } else {
                    alert('이미지를 추가해주세요.');
                    uploadStatus.textContent = '';
                    return;
                }
            }

            if (sizes.length === 0) {
                alert('하나 이상의 사이즈와 가격을 입력해주세요.');
                uploadStatus.textContent = '';
                return;
            }

            const productData = {
                name: productName,
                price: sizes[0].price, // 대표 가격으로 첫 번째 사이즈의 가격을 사용
                description: productDescription,
                colors: colors,
                sizes: sizes,
            };

            if (editMode) {
                // 수정 모드
                const productRef = doc(db, 'products', currentProductId);
                const docSnap = await getDoc(productRef);
                if (docSnap.exists()) {
                    const existingProduct = docSnap.data();
                    productData.shippingFeeExempt = existingProduct.shippingFeeExempt || false;
                }

                await updateDoc(productRef, productData);
                uploadStatus.textContent = '상품이 성공적으로 수정되었습니다!';
            } else {
                // 추가 모드
                productData.createdAt = serverTimestamp();
                productData.shippingFeeExempt = false; // 기본값으로 false 설정
                await addDoc(collection(db, 'products'), productData);
                uploadStatus.textContent = '상품이 성공적으로 추가되었습니다!';
            }

            resetForm();

            setTimeout(() => {
                uploadStatus.textContent = '';
            }, 3000);

        } catch (error) {
            console.error('상품 처리 중 오류 발생:', error);
            uploadStatus.textContent = `오류: ${error.message}`;
        }
    });

    function resetForm() {
        addProductForm.reset();
        editMode = false;
        currentProductId = null;
        submitButton.textContent = '상품 추가하기';
        colorOptionsContainer.innerHTML = `
            <div class="color-option">
                <input type="text" placeholder="색상명 (예: Red)" class="product-color" required>
                <input type="file" class="color-image" accept="image/*" required>
            </div>`;
        sizeOptionsContainer.innerHTML = `
            <div class="size-option">
                <input type="text" placeholder="사이즈 (예: S)" class="product-size" required>
                <input type="number" placeholder="가격" class="product-size-price" required>
            </div>`;
    }

    // --- 상품 관리 기능 추가 ---
    const productListAdmin = document.getElementById('product-list-admin');

    // 관리자 페이지 상품 목록 렌더링
    function renderAdminProducts() {
        const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
        onSnapshot(q, snapshot => {
            productListAdmin.innerHTML = '';
            if (snapshot.empty) {
                productListAdmin.innerHTML = '<tr><td colspan="4">등록된 상품이 없습니다.</td></tr>';
                return;
            }
            snapshot.forEach(doc => {
                const product = { id: doc.id, ...doc.data() };
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${product.name}</td>
                    <td>₩${product.price.toLocaleString()}</td>
                    <td>
                        <input type="checkbox" class="shipping-exempt-checkbox" data-id="${product.id}" ${product.shippingFeeExempt ? 'checked' : ''}>
                    </td>
                    <td>
                        <button class="btn-secondary edit-product-btn" data-id="${product.id}">수정</button>
                        <button class="btn-danger delete-product-btn" data-id="${product.id}">삭제</button>
                    </td>
                `;
                productListAdmin.appendChild(tr);
            });
        }, error => {
            console.error("상품 로딩 중 에러 발생: ", error);
            productListAdmin.innerHTML = '<tr><td colspan="3">상품을 불러오는 데 실패했습니다.</td></tr>';
        });
    }

    // 상품 수정 및 삭제 이벤트 처리
    productListAdmin.addEventListener('click', async (e) => {
        const target = e.target;
        const productId = target.dataset.id;

        if (target.classList.contains('shipping-exempt-checkbox')) {
            const isExempt = target.checked;
            const productRef = doc(db, 'products', productId);
            updateDoc(productRef, { shippingFeeExempt: isExempt }).catch(error => {
                console.error('배송비 면제 상태 업데이트 중 오류 발생:', error);
                alert('배송비 면제 상태 업데이트에 실패했습니다.');
                // Revert the checkbox state on error
                target.checked = !isExempt;
            });
            return; // Prevent other click handlers from running
        }

        if (target.classList.contains('delete-product-btn')) {
            // 삭제 처리
            if (confirm('정말로 이 상품을 삭제하시겠습니까?')) {
                try {
                    await deleteDoc(doc(db, 'products', productId));
                } catch (error) {
                    console.error('상품 삭제 중 오류 발생:', error);
                    alert('상품 삭제에 실패했습니다.');
                }
            }
        } else if (target.classList.contains('edit-product-btn')) {
            // 수정 처리
            const productRef = doc(db, 'products', productId);
            const docSnap = await getDoc(productRef);
            if (!docSnap.exists()) return;

            const product = docSnap.data();
            
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-description').value = product.description;

            colorOptionsContainer.innerHTML = product.colors.map(color => `
                <div class="color-option" data-existing-image="${color.image}">
                    <input type="text" placeholder="색상명" class="product-color" value="${color.name}" required>
                    <input type="file" class="color-image" accept="image/*">
                    <p class="existing-image-info">기존 이미지: <a href="${color.image}" target="_blank">보기</a></p>
                    <button type="button" class="remove-option-btn">삭제</button>
                </div>
            `).join('');

            sizeOptionsContainer.innerHTML = product.sizes.map(size => `
                <div class="size-option">
                    <input type="text" placeholder="사이즈" class="product-size" value="${size.name}" required>
                    <input type="number" placeholder="가격" class="product-size-price" value="${size.price}" required>
                    <button type="button" class="remove-option-btn">삭제</button>
                </div>
            `).join('');

            editMode = true;
            currentProductId = productId;
            submitButton.textContent = '상품 수정하기';
            window.scrollTo(0, 0); // 페이지 상단으로 스크롤
        }
    });

    // 초기 상품 목록 렌더링
    renderAdminProducts();

    // --- 쿠폰 관리 기능 추가 ---
    const addCouponForm = document.getElementById('add-coupon-form');
    const couponCodeInput = document.getElementById('coupon-code');
    const discountPercentageInput = document.getElementById('discount-percentage');
    const couponQuantityInput = document.getElementById('coupon-quantity');
    const couponListAdmin = document.getElementById('coupon-list-admin');

    // 쿠폰 목록 렌더링
    function renderCoupons() {
        const q = query(collection(db, 'coupons'), orderBy('code'));
        onSnapshot(q, snapshot => {
            couponListAdmin.innerHTML = '';
            if (snapshot.empty) {
                couponListAdmin.innerHTML = '<tr><td colspan="4">등록된 쿠폰이 없습니다.</td></tr>';
                return;
            }
            snapshot.forEach(doc => {
                const coupon = { id: doc.id, ...doc.data() };
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${coupon.code}</td>
                    <td>${coupon.discountPercentage}%</td>
                    <td>${coupon.quantity}</td>
                    <td>
                        <button class="btn-danger delete-coupon-btn" data-id="${coupon.id}">삭제</button>
                    </td>
                `;
                couponListAdmin.appendChild(tr);
            });
        }, error => {
            console.error("쿠폰 로딩 중 에러 발생: ", error);
            couponListAdmin.innerHTML = '<tr><td colspan="4">쿠폰을 불러오는 데 실패했습니다.</td></tr>';
        });
    }

    // 쿠폰 추가 이벤트 처리
    addCouponForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const code = couponCodeInput.value.trim();
        const discountPercentage = parseFloat(discountPercentageInput.value);
        const quantity = parseInt(couponQuantityInput.value);

        if (!code || isNaN(discountPercentage) || discountPercentage < 1 || discountPercentage > 100 || isNaN(quantity) || quantity < 1) {
            alert('유효한 쿠폰 코드, 할인율(1-100%), 그리고 수량(1 이상)을 입력해주세요.');
            return;
        }

        try {
            await addDoc(collection(db, 'coupons'), {
                code: code,
                discountPercentage: discountPercentage,
                quantity: quantity,
                createdAt: serverTimestamp()
            });
            alert('쿠폰이 성공적으로 추가되었습니다.');
            couponCodeInput.value = '';
            discountPercentageInput.value = '';
            couponQuantityInput.value = '';
        } catch (error) {
            console.error('쿠폰 추가 중 오류 발생:', error);
            alert('쿠폰 추가에 실패했습니다.');
        }
    });

    // 쿠폰 삭제 이벤트 처리
    couponListAdmin.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.classList.contains('delete-coupon-btn')) {
            const couponId = target.dataset.id;
            if (confirm('정말로 이 쿠폰을 삭제하시겠습니까?')) {
                try {
                    await deleteDoc(doc(db, 'coupons', couponId));
                    alert('쿠폰이 성공적으로 삭제되었습니다.');
                } catch (error) {
                    console.error('쿠폰 삭제 중 오류 발생:', error);
                    alert('쿠폰 삭제에 실패했습니다.');
                }
            }
        }
    });

    // 초기 쿠폰 목록 렌더링
    renderCoupons();

    // --- 주문 관리 기능 ---
    const orderManagementSection = document.getElementById('order-management-section');
    const orderListContainer = document.getElementById('order-list');



    // Firestore에서 주문 목록 불러오기 및 렌더링
    function renderOrders() {
        const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
        onSnapshot(q, snapshot => {
            orderListContainer.innerHTML = '';
            if (snapshot.empty) {
                orderListContainer.innerHTML = '<p>새로운 주문이 없습니다.</p>';
                return;
            }
            snapshot.forEach(doc => {
                const order = { id: doc.id, ...doc.data() };
                const orderCard = document.createElement('div');
                orderCard.classList.add('order-card'); // CSS 스타일링을 위한 클래스

                const itemsHtml = order.items.map(item => `
                    <li>${item.name} (사이즈: ${item.size}, 색상: ${item.color}) x ${item.quantity}</li>
                `).join('');

                const createdAt = order.createdAt ? order.createdAt.toDate().toLocaleString('ko-KR') : '날짜 정보 없음';

                orderCard.innerHTML = `
                    <div class="order-header">
                        <strong>주문번호: ${order.id}</strong>
                        <span>주문일시: ${createdAt}</span>
                    </div>
                    <div class="order-body">
                        <p><strong>입금자:</strong> ${order.payer} | <strong>연락처:</strong> ${order.phone}</p>
                        <p><strong>메모:</strong> ${order.memo || '-'}</p>
                        <p><strong>주문 상품:</strong></p>
                        <ul>${itemsHtml}</ul>
                        <p><strong>총 결제금액:</strong> ₩${(order.total || 0).toLocaleString()}</p>
                    </div>
                    <div class="order-actions">
                        <label for="status-select-${order.id}">주문 상태:</label>
                        <select id="status-select-${order.id}" data-id="${order.id}">
                            <option value="주문대기" ${order.status === '주문대기' ? 'selected' : ''}>주문대기</option>
                            <option value="주문완료" ${order.status === '입금확인' || order.status === '주문완료' ? 'selected' : ''}>주문완료</option>
                            <option value="배송중" ${order.status === '배송중' ? 'selected' : ''}>배송중</option>
                            <option value="배달완료" ${order.status === '배달완료' ? 'selected' : ''}>배달완료</option>
                        </select>
                        <button class="btn-secondary update-status-btn" data-id="${order.id}">상태 저장</button>
                    </div>
                `;
                orderListContainer.appendChild(orderCard);
            });
        }, error => {
            console.error("주문 로딩 중 에러 발생: ", error);
            orderListContainer.innerHTML = '<p>주문을 불러오는 데 실패했습니다.</p>';
        });
    }

    // 주문 상태 업데이트 이벤트 처리
    orderListContainer.addEventListener('click', async (e) => {
        if (e.target.classList.contains('update-status-btn')) {
            const orderId = e.target.dataset.id;
            const statusSelect = document.getElementById(`status-select-${orderId}`);
            const newStatus = statusSelect.value;

            if (confirm(`주문(${orderId})의 상태를 '${statusSelect.options[statusSelect.selectedIndex].text}'(으)로 변경하시겠습니까?`)) {
                try {
                    const orderRef = doc(db, 'orders', orderId);
                    await updateDoc(orderRef, { status: newStatus });
                    alert('주문 상태가 성공적으로 업데이트되었습니다.');
                } catch (error) {
                    console.error('주문 상태 업데이트 중 오류 발생:', error);
                    alert('주문 상태 업데이트에 실패했습니다.');
                }
            }
        }
    });

    // 초기 주문 목록 렌더링
    renderOrders();
}
