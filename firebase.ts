import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyC3etu3ZLb1afyVGa-93gSUW9MA_T5WW5E",
    authDomain: "bookloop-44c82.firebaseapp.com",
    projectId: "bookloop-44c82",
    storageBucket: "bookloop-44c82.firebasestorage.app",
    messagingSenderId: "7885222095",
    appId: "1:7885222095:web:06cd0a730606611281c7ba",
    measurementId: "G-DPPZJ5GH76"
};

const app = initializeApp(firebaseConfig);

// Initialize analytics only in web environment
let analytics: any = null;
if (Platform.OS === 'web') {
    try {
        const { getAnalytics, isSupported } = require("firebase/analytics");
        isSupported().then((supported: boolean) => {
            if (supported) {
                analytics = getAnalytics(app);
            }
        }).catch(() => {
            // Analytics not supported, ignore
        });
    } catch (error) {
        // Analytics not available, ignore
    }
}

const auth = getAuth(app);
const db = getFirestore(app);

export { analytics, app, auth, db, firebaseConfig };

