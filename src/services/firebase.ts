import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyForSimulation",
  authDomain: "dtr-system-simulation.firebaseapp.com",
  projectId: "dtr-system-simulation",
  storageBucket: "dtr-system-simulation.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000"
};

// Initialize Firebase with error handling
let app;
let db;
let auth;

try {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
  // Fallback initialization
  try {
    app = initializeApp(firebaseConfig, "fallback-instance");
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("Firebase fallback initialization successful");
  } catch (fallbackError) {
    console.error("Firebase fallback initialization failed:", fallbackError);
    // Create mock objects to prevent app crashes
    app = {} as any;
    db = {
      collection: () => ({ doc: () => ({ set: () => Promise.resolve() }) }),
      doc: () => ({ set: () => Promise.resolve() })
    } as any;
    auth = { currentUser: null } as any;
  }
}

export { app, db, auth };
