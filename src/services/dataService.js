import { db } from '../config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import * as staticData from '../data/cvData';

// Cache for fetched data
let cachedData = null;

/**
 * Fetch data from Firebase or fall back to static data
 */
export async function fetchCVData() {
  // Return cached data if available
  if (cachedData) return cachedData;
  
  // Try Firebase first
  if (db) {
    try {
      const data = {};
      
      // Fetch personal info
      const personalInfoSnap = await getDocs(collection(db, 'personalInfo'));
      if (!personalInfoSnap.empty) {
        data.personalInfo = personalInfoSnap.docs[0].data();
      }
      
      // Fetch experiences
      const experiencesSnap = await getDocs(collection(db, 'experiences'));
      data.experiences = experiencesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Fetch side experiences
      const sideExpSnap = await getDocs(collection(db, 'sideExperiences'));
      data.sideExperiences = sideExpSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Fetch projects
      const projectsSnap = await getDocs(collection(db, 'projects'));
      data.projects = projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Fetch skills
      const skillsSnap = await getDocs(collection(db, 'skills'));
      if (!skillsSnap.empty) {
        data.skills = skillsSnap.docs[0].data();
      }
      
      // Check if we got any data
      if (Object.keys(data).length > 0 && data.personalInfo) {
        console.log('✅ Data loaded from Firebase');
        cachedData = data;
        return data;
      }
    } catch (error) {
      console.warn('Firebase fetch failed, using static data:', error.message);
    }
  }
  
  // Fall back to static data
  console.log('📁 Using static data');
  cachedData = {
    personalInfo: staticData.personalInfo,
    experiences: staticData.experiences,
    sideExperiences: staticData.sideExperiences,
    projects: staticData.projects,
    skills: staticData.skills,
  };
  
  return cachedData;
}

/**
 * Hook-friendly data fetcher
 */
export function useFirebaseData() {
  return {
    fetchData: fetchCVData,
    isFirebaseAvailable: !!db,
  };
}

// Export static data as fallback
export { staticData };
