import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAxJYIPUNAByBrnvYx1ujpZ_8PT7wgxdyE",
  authDomain: "steerlo.firebaseapp.com",
  projectId: "steerlo",
  storageBucket: "steerlo.firebasestorage.app",
  messagingSenderId: "978351080658",
  appId: "1:978351080658:web:ee67d7a31f5e6db1c1190b"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
