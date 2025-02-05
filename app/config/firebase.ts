import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyB3tJ2CJg2FJEKLbXvDue67-r_u-JnrxJ0",
    authDomain: "instagram-clone-41f56.firebaseapp.com",
    projectId: "instagram-clone-41f56",
    storageBucket: "instagram-clone-41f56.firebasestorage.app",
    messagingSenderId: "600245513537",
    appId: "1:600245513537:web:0241f495d82fae6b6005c0",
    measurementId: "G-5HSM8BPB65",
    databaseURL: "https://instagram-clone-41f56-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db }; 