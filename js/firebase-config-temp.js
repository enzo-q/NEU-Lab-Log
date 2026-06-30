/*
 * NEU Laboratory Usage Log — Firebase Configuration
 *
 * SECURITY NOTE:
 * For production, store these values in a .env file and use a bundler (e.g., Vite).
 * Example: const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
 * See .env.example for the full list of required environment variables.
 *
 * Firebase web API keys are NOT secret (they identify your project to Google),
 * but best practice is to keep them out of version control via .env + .gitignore.
 *

const firebaseConfig = {
  apiKey:            "1",
  authDomain:        "2",
  projectId:         "3",
  storageBucket:     "4",
  messagingSenderId: "5",
  appId:             "6",
  measurementId:     "7"
};

// Initialize Firebase (compat SDK — works without a bundler)
firebase.initializeApp(firebaseConfig);

// Expose shared references as globals for all pages to use
window.db   = firebase.firestore();
window.auth = firebase.auth();

console.log("[NEU Lab Log] Firebase initialized ✓");
*/