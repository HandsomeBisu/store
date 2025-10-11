
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB6RH0UsPuGlw6Mh8hO0G_dCAgAKZaHkSs",
  authDomain: "dps-store-aa56c.firebaseapp.com",
  projectId: "dps-store-aa56c",
  storageBucket: "dps-store-aa56c.firebasestorage.app",
  messagingSenderId: "751223678935",
  appId: "1:751223678935:web:64cf86f29773785abf4d92",
  measurementId: "G-0ME873YZM2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };
