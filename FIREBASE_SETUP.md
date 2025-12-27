# Firebase Setup Guide

## 📋 Overview
Your CV application now uses Firebase Firestore for data storage with automatic fallback to static data.

## 🔧 Setup Steps

### 1. Deploy Firestore Security Rules

Copy the contents of `firestore.rules` and paste them in your Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **heshamamoudi**
3. Navigate to **Firestore Database** → **Rules**
4. Replace the existing rules with the contents of `firestore.rules`
5. Click **Publish**

### 2. Seed Your Database

Run the seed script to populate Firestore with your CV data:

```bash
# Option 1: Using Node.js directly
node -r @babel/register src/scripts/seedFirebase.js

# Option 2: Add to package.json scripts
npm run seed
```

Add this to your `package.json`:
```json
{
  "scripts": {
    "seed": "node -r @babel/register src/scripts/seedFirebase.js"
  }
}
```

### 3. Verify Data

1. Go to Firebase Console → **Firestore Database**
2. Check that these collections exist:
   - `personalInfo`
   - `experiences`
   - `sideExperiences`
   - `projects`
   - `skills`

## 🔒 Security Rules Explained

### Current Rules (Development):
- **Read**: Public (anyone can view your CV)
- **Write**: Authenticated users only

### For Production:
Update the rules to use admin tokens:

```javascript
allow write: if request.auth != null && request.auth.token.admin == true;
```

## 📊 Data Structure

### Collections:

**personalInfo** (single document):
```javascript
{
  name: string,
  title: string,
  email: string,
  phone: string,
  location: string,
  github: string,
  linkedin: string,
  summary: string,
  updatedAt: timestamp
}
```

**experiences** (multiple documents):
```javascript
{
  title: string,
  company: string,
  location: string,
  period: string,
  description: string,
  achievements: array,
  order: number,
  createdAt: timestamp
}
```

**projects** (multiple documents):
```javascript
{
  title: string,
  description: string,
  technologies: array,
  github: string,
  demo: string,
  image: string,
  order: number,
  createdAt: timestamp
}
```

## 🔄 How It Works

1. **App loads** → Tries to fetch from Firebase
2. **If Firebase succeeds** → Uses cloud data ✅
3. **If Firebase fails** → Falls back to static data 📁
4. **Data is cached** → No repeated fetches

## 🚀 Updating Content

### Option 1: Firebase Console (GUI)
1. Go to Firestore Database
2. Navigate to collection
3. Edit document fields directly

### Option 2: Re-seed
1. Update data in `src/data/cvData.js`
2. Run seed script again
3. New data overwrites old data

## 📝 Notes

- Firebase config is in `src/config/firebase.js`
- Data service is in `src/services/dataService.js`
- Static data fallback ensures app always works
- Analytics is enabled for tracking

## 🆘 Troubleshooting

**"Permission denied" error:**
- Check Firestore rules are deployed
- Verify rules allow public read access

**"Firebase not initialized":**
- Check API key and project ID
- Ensure internet connection

**Data not showing:**
- Run seed script
- Check Firebase Console for data
- Verify collection names match

## 🔐 Environment Variables (Optional)

For added security, use environment variables:

Create `.env.local`:
```
REACT_APP_FIREBASE_API_KEY=AIzaSyCSpZUcsyW7VdbpqMCfL_UhVYG9SJkLPg4
REACT_APP_FIREBASE_AUTH_DOMAIN=heshamamoudi.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=heshamamoudi
```

Then update `firebase.js` to use `process.env` variables.
