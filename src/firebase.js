import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBKuhP7CqLZJ74Q5ICoZsqXRn4-NbuDSiA",
  authDomain: "crockery-website.firebaseapp.com",
  projectId: "crockery-website",
  storageBucket: "crockery-website.firebasestorage.app",
  messagingSenderId: "257917390550",
  appId: "1:257917390550:web:dd535acfb19ea8563b8377"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
