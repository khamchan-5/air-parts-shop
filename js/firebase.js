// Firebase SDK ผ่าน CDN ไม่ต้องติดตั้ง Node.js หรือ React
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCS9YL9CLFmHoyImIzHe6WIcHhnHWkWEg0",
  authDomain: "air-prod-244d8.firebaseapp.com",
  databaseURL: "https://air-prod-244d8-default-rtdb.firebaseio.com",
  projectId: "air-prod-244d8",
  storageBucket: "air-prod-244d8.firebasestorage.app",
  messagingSenderId: "759394289306",
  appId: "1:759394289306:web:5ab435a3e59e1243904123",
  measurementId: "G-YCTBCGWRYB"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);
