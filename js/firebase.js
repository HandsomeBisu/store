
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCwpWBNTjc-0K4-6lvbmcpKYO3EAfdFMHg",
    authDomain: "store-dps.firebaseapp.com",
    projectId: "store-dps",
    storageBucket: "store-dps.appspot.com",
    messagingSenderId: "706928532499",
    appId: "1:706928532499:web:665dcc5b9c39d3dc9473e6"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
