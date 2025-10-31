document.addEventListener('DOMContentLoaded', () => {
    const addProductForm = document.getElementById('add-product-form');
    const submitButton = document.getElementById('submit-product');
    const uploadStatus = document.getElementById('upload-status');
    const colorOptionsContainer = document.getElementById('color-options-container');
    const addColorOptionBtn = document.getElementById('add-color-option');
    const sizeOptionsContainer = document.getElementById('size-options-container');
    const addSizeOptionBtn = document.getElementById('add-size-option');

    let editMode = false;
    let currentProductId = null;


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
        const productPrice = parseFloat(document.getElementById('product-price').value);
        const productDescription = document.getElementById('product-description').value;
        const colorOptions = colorOptionsContainer.querySelectorAll('.color-option');
        const sizeOptions = sizeOptionsContainer.querySelectorAll('.size-option');

        if (!productName || !productPrice || colorOptions.length === 0 || sizeOptions.length === 0) {
            alert('상품명, 가격, 색상, 사이즈는 필수 항목입니다.');
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

            const sizes = Array.from(sizeOptions).map(opt => opt.querySelector('.product-size').value).filter(Boolean);
            if (sizes.length === 0) {
                alert('하나 이상의 사이즈를 입력해주세요.');
                uploadStatus.textContent = '';
                return;
            }

            const productData = {
                name: productName,
                price: productPrice,
                description: productDescription,
                colors: colors,
                sizes: sizes,
            };

            if (editMode) {
                // 수정 모드
                await db.collection('products').doc(currentProductId).update(productData);
                uploadStatus.textContent = '상품이 성공적으로 수정되었습니다!';
            } else {
                // 추가 모드
                productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('products').add(productData);
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
            </div>`;
    }

    // --- 상품 관리 기능 추가 ---
    const productListAdmin = document.getElementById('product-list-admin');

    // 관리자 페이지 상품 목록 렌더링
    function renderAdminProducts() {
        db.collection('products').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            productListAdmin.innerHTML = '';
            if (snapshot.empty) {
                productListAdmin.innerHTML = '<tr><td colspan="3">등록된 상품이 없습니다.</td></tr>';
                return;
            }
            snapshot.forEach(doc => {
                const product = { id: doc.id, ...doc.data() };
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${product.name}</td>
                    <td>₩${product.price.toLocaleString()}</td>
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

        if (target.classList.contains('delete-product-btn')) {
            // 삭제 처리
            if (confirm('정말로 이 상품을 삭제하시겠습니까?')) {
                try {
                    await db.collection('products').doc(productId).delete();
                } catch (error) {
                    console.error('상품 삭제 중 오류 발생:', error);
                    alert('상품 삭제에 실패했습니다.');
                }
            }
        } else if (target.classList.contains('edit-product-btn')) {
            // 수정 처리
            const doc = await db.collection('products').doc(productId).get();
            if (!doc.exists) return;

            const product = doc.data();
            
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-price').value = product.price;
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
                    <input type="text" placeholder="사이즈" class="product-size" value="${size}" required>
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
});
