
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, getDocs } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCpdlnBWRFvBWiz1Zdj20E9a_tcQir1OEg",
  authDomain: "dtr-test-6abcb.firebaseapp.com",
  projectId: "dtr-test-6abcb",
  storageBucket: "dtr-test-6abcb.firebasestorage.app",
  messagingSenderId: "487340785463",
  appId: "1:487340785463:web:438209656c8425f20ce4b2",
  measurementId: "G-XNCB7EZS04"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

// Example function to fetch data
const fetchData = async () => {
  const querySnapshot = await getDocs(collection(db, "users"));
  querySnapshot.forEach((doc) => {
    console.log(doc.id, "=>", doc.data());
  });
};

// Export the database instance
export { db };
