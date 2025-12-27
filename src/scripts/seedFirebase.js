// Firebase Seed Script - Run with: npm run seed
// This script populates your Firestore database with CV data

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

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

// CV Data - Update this with your actual data
const cvData = require('../data/cvData');

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Seed Firebase Firestore with CV data
 */
async function seedFirebase() {
  try {
    console.log('\n🌱 Starting Firebase seed...\n');

    // 1. Seed Personal Info
    console.log('📝 Seeding personal info...');
    await setDoc(doc(db, 'personalInfo', 'main'), {
      ...cvData.personalInfo,
      updatedAt: new Date().toISOString(),
    });
    console.log('   ✅ Personal info seeded');

    // 2. Seed Experiences
    console.log('\n💼 Seeding experiences...');
    for (const [index, experience] of cvData.experiences.entries()) {
      await setDoc(doc(db, 'experiences', `exp_${index + 1}`), {
        ...experience,
        order: index,
        createdAt: new Date().toISOString(),
      });
      console.log(`   ✓ Experience ${index + 1}: ${experience.title}`);
    }
    console.log(`   ✅ ${cvData.experiences.length} experiences seeded`);

    // 3. Seed Side Experiences
    console.log('\n💡 Seeding side experiences...');
    for (const [index, sideExp] of cvData.sideExperiences.entries()) {
      await setDoc(doc(db, 'sideExperiences', `side_${index + 1}`), {
        ...sideExp,
        order: index,
        createdAt: new Date().toISOString(),
      });
      console.log(`   ✓ Side Experience ${index + 1}: ${sideExp.title}`);
    }
    console.log(`   ✅ ${cvData.sideExperiences.length} side experiences seeded`);

    // 4. Seed Projects
    console.log('\n🚀 Seeding projects...');
    for (const [index, project] of cvData.projects.entries()) {
      await setDoc(doc(db, 'projects', `project_${index + 1}`), {
        ...project,
        order: index,
        createdAt: new Date().toISOString(),
      });
      console.log(`   ✓ Project ${index + 1}: ${project.title}`);
    }
    console.log(`   ✅ ${cvData.projects.length} projects seeded`);

    // 5. Seed Skills
    console.log('\n⚙️ Seeding skills...');
    await setDoc(doc(db, 'skills', 'main'), {
      ...cvData.skills,
      updatedAt: new Date().toISOString(),
    });
    console.log('   ✅ Skills seeded');

    console.log('\n🎉 Firebase seed completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Personal Info: 1 document`);
    console.log(`   - Experiences: ${cvData.experiences.length} documents`);
    console.log(`   - Side Experiences: ${cvData.sideExperiences.length} documents`);
    console.log(`   - Projects: ${cvData.projects.length} documents`);
    console.log(`   - Skills: 1 document`);
    console.log('\n✨ Your data is now in Firestore!');
    console.log('🔗 View at: https://console.firebase.google.com/project/heshamamoudi/firestore\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error seeding Firebase:', error);
    console.error('Error details:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Check your internet connection');
    console.error('  2. Verify Firebase configuration');
    console.error('  3. Ensure Firestore is enabled in Firebase Console');
    console.error('  4. Check Firestore security rules\n');
    process.exit(1);
  }
}

// Run the seed function
seedFirebase();
