import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBeKiWCFvX2AjSVToOjZBtkOe2LI8wy7_k",
  authDomain: "app-ninho-294c2.firebaseapp.com",
  projectId: "app-ninho-294c2",
  storageBucket: "app-ninho-294c2.firebasestorage.app",
  messagingSenderId: "262688298106",
  appId: "1:262688298106:web:e3fc5d3202ead9ef8ad7c3",
  measurementId: "G-K8XHED0RGS"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export { messaging, getToken, onMessage };