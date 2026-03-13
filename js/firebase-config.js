/**
 * NEU Laboratory Usage Log — Firebase Configuration
 *
 * SECURITY NOTE:
 * For production, store these values in a .env file and use a bundler (e.g., Vite).
 * Example: const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
 * See .env.example for the full list of required environment variables.
 *
 * Firebase web API keys are NOT secret (they identify your project to Google),
 * but best practice is to keep them out of version control via .env + .gitignore.
 */

const firebaseConfig = {
  apiKey:            "AIzaSyA3_AI-OzBdfjhwl4TuA1dWbTY2lQ9lgBQ",
  authDomain:        "database-1011.web.app",    // must match hosting domain for Safari ITP
  projectId:         "database-1011",
  storageBucket:     "database-1011.firebasestorage.app",
  messagingSenderId: "425332525550",
  appId:             "1:425332525550:web:2d3079a13577878d5666ff",
  measurementId:     "G-YGC01LT3LS"
};

// Initialize Firebase (compat SDK — works without a bundler)
firebase.initializeApp(firebaseConfig);

// Expose shared references as globals for all pages to use
window.db   = firebase.firestore();
window.auth = firebase.auth();

console.log("[NEU Lab Log] Firebase initialized ✓");
