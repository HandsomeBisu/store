
import { app } from './firebase.js';
import { auth, onAuthChange, signOutUser } from './auth.js';
import {
    getFirestore,
    collection,
    getDocs,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const db = getFirestore(app);

// --- CONFIGURATION ---
// In a real app, fetch this from a secure location in your database
const ADMIN_UID = "2gJ3WkOPBBYSPe4I53YpDCc61jA2"; 

// --- DOM Elements ---
const adminContent = document.getElementById('admin-content');
const authCheck = document.getElementById('auth-check');
const productForm = document.getElementById('product-form');
const productList = document.getElementById('product-list');
const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const productIdField = document.getElementById('product-id');
const logoutBtn = document.getElementById('logoutBtn');

// --- AUTHENTICATION ---
onAuthChange(user => {
    if (user && user.uid === ADMIN_UID) {
        // User is an admin
        authCheck.classList.add('hidden');
        adminContent.classList.remove('hidden');
        initAdmin();
    } else {
        // User is not an admin or not logged in
        authCheck.innerHTML = `
            <h2 class="text-2xl font-bold text-red-600 mb-4">액세스 거부됨</h2>
            <p class="text-gray-700">이 페이지에 접근할 권한이 없습니다.</p>
            <a href="index.html" class="mt-6 inline-block bg-sky-600 text-white px-6 py-2 rounded-lg hover:bg-sky-700">상점으로 돌아가기</a>
        `;
    }
});

logoutBtn.addEventListener('click', async () => {
    await signOutUser();
    window.location.href = 'index.html';
});

// --- ADMIN INITIALIZATION ---
async function initAdmin() {
    await loadProducts();
    setupEventListeners();
}

function setupEventListeners() {
    productForm.addEventListener('submit', handleFormSubmit);
    cancelEditBtn.addEventListener('click', resetForm);
}

// --- PRODUCT MANAGEMENT ---

// Load products from Firestore and render them
async function loadProducts() {
    const productsRef = collection(db, "products");
    const q = query(productsRef, orderBy("name")); // Order by name
    const querySnapshot = await getDocs(q);

    productList.innerHTML = ''; // Clear list
    querySnapshot.forEach(doc => {
        const product = { id: doc.id, ...doc.data() };
        const productElement = createProductElement(product);
        productList.appendChild(productElement);
    });
}

// Create HTML element for a single product
function createProductElement(product) {
    const div = document.createElement('div');
    div.className = 'flex items-center justify-between bg-gray-50 p-4 rounded-lg';
    div.innerHTML = `
        <div>
            <p class="font-bold text-lg">${product.name} <span class="text-sm font-normal text-gray-500">(${product.category})</span></p>
            <p class="text-sky-600">${product.price.toLocaleString()}P</p>
        </div>
        <div class="space-x-4">
            <button data-id="${product.id}" class="edit-btn text-blue-500 hover:underline">수정</button>
            <button data-id="${product.id}" class="delete-btn text-red-500 hover:underline">삭제</button>
        </div>
    `;

    // Add event listeners for edit/delete buttons
    div.querySelector('.edit-btn').addEventListener('click', () => populateFormForEdit(product));
    div.querySelector('.delete-btn').addEventListener('click', () => deleteProduct(product.id, product.name));

    return div;
}

// Handle form submission for both creating and updating products
async function handleFormSubmit(e) {
    e.preventDefault();
    const productId = productIdField.value;

    const productData = {
        name: document.getElementById('name').value,
        price: Number(document.getElementById('price').value),
        category: document.getElementById('category').value,
        emoji: document.getElementById('emoji').value,
        description: document.getElementById('description').value,
    };

    if (productId) {
        // Update existing product
        const productRef = doc(db, "products", productId);
        await updateDoc(productRef, productData);
        alert('상품이 성공적으로 업데이트되었습니다.');
    } else {
        // Add new product
        // For a new product, we should also add the 'id' field based on timestamp or a unique generator
        productData.id = Date.now(); // Simple unique ID
        await addDoc(collection(db, "products"), productData);
        alert('상품이 성공적으로 추가되었습니다.');
    }

    await loadProducts();
    resetForm();
}

// Delete a product
async function deleteProduct(id, name) {
    if (confirm(`정말로 '${name}' 상품을 삭제하시겠습니까?`)) {
        await deleteDoc(doc(db, "products", id));
        alert('상품이 삭제되었습니다.');
        await loadProducts();
        resetForm(); // If the deleted item was being edited
    }
}

// Populate the form with data from the product to be edited
function populateFormForEdit(product) {
    formTitle.textContent = '상품 수정';
    submitBtn.textContent = '수정 완료';
    cancelEditBtn.classList.remove('hidden');

    productIdField.value = product.id;
    document.getElementById('name').value = product.name;
    document.getElementById('price').value = product.price;
    document.getElementById('category').value = product.category;
    document.getElementById('emoji').value = product.emoji;
    document.getElementById('description').value = product.description;

    window.scrollTo(0, 0); // Scroll to top to see the form
}

// Reset the form to its initial state for adding a new product
function resetForm() {
    formTitle.textContent = '새 상품 추가';
    submitBtn.textContent = '상품 추가';
    cancelEditBtn.classList.add('hidden');
    productForm.reset();
    productIdField.value = '';
}
