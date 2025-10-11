
import { app } from './firebase.js';
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// --- Auth State Observer ---
const onAuthChange = (callback) => {
    return onAuthStateChanged(auth, callback);
};

// --- Email & Password ---
const signUpWithEmail = async (email, password) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return { user: userCredential.user };
    } catch (error) {
        return { error: error.message };
    }
};

const signInWithEmail = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { user: userCredential.user };
    } catch (error) {
        return { error: error.message };
    }
};

// --- Google Sign-In ---
const signInWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        return { user: result.user };
    } catch (error) {
        return { error: error.message };
    }
};

// --- Sign Out ---
const signOutUser = async () => {
    try {
        await signOut(auth);
        return {};
    } catch (error) {
        return { error: error.message };
    }
};

export {
    auth,
    onAuthChange,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signOutUser
};
