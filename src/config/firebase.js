import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCSpZUcsyW7VdbpqMCfL_UhVYG9SJkLPg4",
  authDomain: "heshamamoudi.firebaseapp.com",
  projectId: "heshamamoudi",
  storageBucket: "heshamamoudi.firebasestorage.app",
  messagingSenderId: "444223102868",
  appId: "1:444223102868:web:6172b228867557aaf3b981",
  measurementId: "G-61C61PHZ9Z"
};

// Initialize Firebase
let app;
let db;
let analytics;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  analytics = getAnalytics(app);
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.warn('⚠️ Firebase initialization failed, using static data:', error.message);
  db = null;
  analytics = null;
}

export { db, analytics };
export default app;
