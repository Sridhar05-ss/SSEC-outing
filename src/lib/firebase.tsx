// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAWKmpLqiOApfLb9OGa2WEfs_AmPiItA2g",
  authDomain: "ssec-outing.firebaseapp.com",
  databaseURL: "https://ssec-outing-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ssec-outing",
  storageBucket: "ssec-outing.firebasestorage.app",
  messagingSenderId: "286869609907",
  appId: "1:286869609907:web:91bee1c3ddbdffdaa47fc6",
  measurementId: "G-3DPMH890P2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getDatabase(app);
