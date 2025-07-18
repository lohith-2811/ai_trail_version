// /frontend/src/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyAsJgTPeVLp2U6rS78T0DmlsxMeX9X9wHw",
  authDomain: "jai-gpt.firebaseapp.com",
  projectId: "jai-gpt",
  storageBucket: "jai-gpt.appspot.com",
  messagingSenderId: "1041993257138",
  appId: "1:1041993257138:web:ee5bb9f802d1215af8f9ab",
  measurementId: "G-GEGKYVKQ51"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the auth instance for use in other components
export const auth = getAuth(app);
export const db = getFirestore(app);