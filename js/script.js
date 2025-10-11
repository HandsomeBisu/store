
import {
    onAuthChange,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signOutUser
} from './auth.js';
import { app } from './firebase.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, writeBatch } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// Initialize Firestore
const db = getFirestore(app);

// --- Temp function to upload initial data ---
const uploadInitialProducts = async () => {
    const productsCollection = collection(db, 'products');
    const querySnapshot = await getDocs(productsCollection);
    if (querySnapshot.empty) { // Only upload if the collection is empty
        console.log('Uploading initial products...');
        const batch = writeBatch(db);
        products.forEach(product => {
            const docRef = doc(db, "products", product.id.toString());
            batch.set(docRef, product);
        });
        await batch.commit();
        console.log('Initial products uploaded.');
    }
};


// --- Sample products data ---
// --- Global State ---
let cart = [];
let userPoints = 0;
let currentCategory = 'all';
let currentUser = null;
let allProducts = []; // Cache for products

// --- DOM Elements ---
const productsGrid = document.getElementById('productsGrid');
const cartModal = document.getElementById('cartModal');
const cartBtn = document.getElementById('cartBtn');
const closeCart = document.getElementById('closeCart');
const cartItems = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const totalPoints = document.getElementById('totalPoints');
const checkoutBtn = document.getElementById('checkoutBtn');
const successModal = document.getElementById('successModal');
const closeSuccess = document.getElementById('closeSuccess');
const userPointsEl = document.getElementById('userPoints');


// --- Firebase Firestore Functions ---
const createUserDocument = async (user) => {
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
        await setDoc(userRef, {
            email: user.email,
            points: 15000 // Initial points for new users
        });
    }
};

const getUserPoints = async (userId) => {
    if (!userId) return 0;
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
        return userDoc.data().points;
    }
    return 0;
};

const updateUserPoints = async (userId, newPoints) => {
    if (!userId) return;
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { points: newPoints });
};

// --- Auth State Change Handler ---
onAuthChange(async (user) => {
    currentUser = user;
    const loginBtn = document.getElementById('loginBtn');
    const userProfile = document.getElementById('userProfile');
    const userEmailEl = document.getElementById('userEmail');

    if (user) {
        // User is signed in
        await createUserDocument(user);
        userPoints = await getUserPoints(user.uid);

        if(userEmailEl) userEmailEl.textContent = user.email;
        if(userPointsEl) userPointsEl.textContent = userPoints.toLocaleString();
        
        if(loginBtn) loginBtn.classList.add('hidden');
        if(userProfile) userProfile.classList.remove('hidden');

    } else {
        // User is signed out
        userPoints = 0;
        cart = [];
        currentUser = null;

        if(userEmailEl) userEmailEl.textContent = '';
        if(userPointsEl) userPointsEl.textContent = '0';

        if(loginBtn) loginBtn.classList.remove('hidden');
        if(userProfile) userProfile.classList.add('hidden');
        updateCartUI();
    }
});

// --- UI Functions & Event Listeners ---


async function init() {
    await fetchProducts();
    renderProducts();
    updateCartUI();
    setupEventListeners();
}

function setupEventListeners() {
    cartBtn.addEventListener('click', () => cartModal.classList.remove('hidden'));
    closeCart.addEventListener('click', () => cartModal.classList.add('hidden'));
    closeSuccess.addEventListener('click', () => successModal.classList.add('hidden'));
    checkoutBtn.addEventListener('click', handleCheckout);

    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await signOutUser();
        alert('로그아웃되었습니다.');
        window.location.reload();
    });

    // Category buttons
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentCategory = e.target.closest('.category-btn').dataset.category;
            renderProducts();
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('bg-sky-600', 'text-white'));
            e.target.closest('.category-btn').classList.add('bg-sky-600', 'text-white');
        });
    });
}

// --- Product & Cart Logic (with modifications) ---
async function fetchProducts() {
    const productsCollection = collection(db, 'products');
    const productSnapshot = await getDocs(productsCollection);
    allProducts = productSnapshot.docs.map(doc => doc.data());
    console.log('Products fetched from Firestore:', allProducts);
}

function renderProducts() {
    const filteredProducts = currentCategory === 'all'
        ? allProducts
        : allProducts.filter(p => p.category === currentCategory);

    productsGrid.innerHTML = filteredProducts.map(product => `
        <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow p-6 flex flex-col justify-between">
            <div class="text-center mb-4">
                <div class="text-6xl mb-2">${product.emoji}</div>
                <h4 class="text-lg font-bold text-gray-800 mb-1">${product.name}</h4>
                <p class="text-gray-600 text-sm mb-3 h-10">${product.description}</p>
                <div class="text-2xl font-bold text-sky-600 mb-4">${product.price.toLocaleString()}P</div>
            </div>
            <button onclick="addToCart(${product.id})" class="w-full bg-gradient-to-r from-sky-500 to-blue-500 text-white py-2 rounded-lg hover:from-sky-600 hover:to-blue-600 transition-colors font-medium mt-auto">
                장바구니에 담기
            </button>
        </div>
    `).join('');
}

window.addToCart = (productId) => {
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        window.location.href = 'login.html';
        return;
    }
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        console.error('Product not found:', productId);
        return;
    }
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    updateCartUI();
    cartBtn.classList.add('cart-bounce');
    setTimeout(() => cartBtn.classList.remove('cart-bounce'), 300);
};

window.removeFromCart = (productId) => {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
};

window.updateQuantity = (productId, change) => {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            updateCartUI();
        }
    }
};

function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    cartCount.textContent = totalItems;
    totalPoints.textContent = total.toLocaleString() + 'P';

    renderCartItems();
}

function renderCartItems() {
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="text-center py-8">
                <div class="text-6xl mb-4">🛒</div>
                <p class="text-gray-500">장바구니가 비어있습니다</p>
            </div>
        `;
        return;
    }

    cartItems.innerHTML = cart.map(item => `
        <div class="flex items-center justify-between py-4 border-b">
            <div class="flex items-center">
                <span class="text-3xl mr-4">${item.emoji}</span>
                <div>
                    <h5 class="font-bold text-gray-800">${item.name}</h5>
                    <p class="text-sky-600 font-medium">${item.price.toLocaleString()}P</p>
                </div>
            </div>
            <div class="flex items-center space-x-3">
                <button onclick="updateQuantity(${item.id}, -1)" class="bg-gray-200 hover:bg-gray-300 w-8 h-8 rounded-full flex items-center justify-center">-</button>
                <span class="font-bold text-lg">${item.quantity}</span>
                <button onclick="updateQuantity(${item.id}, 1)" class="bg-gray-200 hover:bg-gray-300 w-8 h-8 rounded-full flex items-center justify-center">+</button>
                <button onclick="removeFromCart(${item.id})" class="text-red-500 hover:text-red-700 ml-4">🗑️</button>
            </div>
        </div>
    `).join('');
}

async function handleCheckout() {
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (cart.length === 0) {
        alert('장바구니가 비어있습니다!');
        return;
    }

    if (total > userPoints) {
        alert(`포인트가 부족합니다! 필요한 포인트: ${total.toLocaleString()}P, 보유 포인트: ${userPoints.toLocaleString()}P`);
        return;
    }

    // Process purchase
    const newPoints = userPoints - total;
    await updateUserPoints(currentUser.uid, newPoints);
    userPoints = newPoints;
    userPointsEl.textContent = userPoints.toLocaleString();

    cart = [];
    updateCartUI();
    cartModal.classList.add('hidden');
    successModal.classList.remove('hidden');
}

// Initialize the app
init();
