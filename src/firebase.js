import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC_k4pW4ERfEmTipcqIHlF3qfKY2iC2DPE",
  authDomain: "personal-sns-4002a.firebaseapp.com",
  projectId: "personal-sns-4002a",
  storageBucket: "personal-sns-4002a.firebasestorage.app",
  messagingSenderId: "860097924679",
  appId: "1:860097924679:web:b05522cf55876959a96b62",
  measurementId: "G-TVX50QTGZ8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
