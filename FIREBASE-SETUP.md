# Firebase Configuration Guide for Fund-It

## ✅ Installation Complete!

Firebase and AngularFire have been successfully installed and configured in your Angular application.

## 📦 What's Been Installed

- **firebase**: Core Firebase SDK
- **@angular/fire**: Official Angular library for Firebase

## 🔧 Configuration Files Created

### 1. Environment Files
- `src/environments/environment.ts` (Development)
- `src/environments/environment.prod.ts` (Production)

### 2. Services Created
- `src/app/services/auth.service.ts` - Authentication service
- `src/app/services/firestore.service.ts` - Firestore database service
- `src/app/services/storage.service.ts` - Cloud Storage service

### 3. App Configuration
- Updated `src/app/app.config.ts` with Firebase providers

## 🚀 Setup Instructions

### Step 1: Get Your Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Click on the **Web** icon (</>) to add a web app
4. Copy your Firebase configuration object

### Step 2: Update Environment Files

Replace the placeholders in both environment files with your actual Firebase config:

**File:** `src/environments/environment.ts` and `environment.prod.ts`

```typescript
firebase: {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
  measurementId: "G-XXXXXXXXXX"
}
```

### Step 3: Enable Firebase Services

In the Firebase Console, enable the services you need:

1. **Authentication**
   - Go to Authentication → Sign-in method
   - Enable Email/Password authentication

2. **Firestore Database**
   - Go to Firestore Database
   - Click "Create database"
   - Start in test mode (for development)

3. **Storage**
   - Go to Storage
   - Click "Get started"
   - Start in test mode (for development)

## 📚 How to Use the Services

### Authentication Service

```typescript
import { AuthService } from './services/auth.service';

// Inject in constructor
constructor(private authService: AuthService) {}

// Sign up
await this.authService.signUp('user@example.com', 'password123');

// Sign in
await this.authService.signIn('user@example.com', 'password123');

// Sign out
await this.authService.logout();

// Get current user
const user = this.authService.getCurrentUser();

// Subscribe to auth state
this.authService.user$.subscribe(user => {
  if (user) {
    console.log('User logged in:', user.email);
  }
});
```

### Firestore Service

```typescript
import { FirestoreService } from './services/firestore.service';

// Inject in constructor
constructor(private firestoreService: FirestoreService) {}

// Add a document
const docId = await this.firestoreService.addDocument('projects', {
  title: 'Smart Garden System',
  goal: 50000,
  raised: 38500
});

// Get a document
const project = await this.firestoreService.getDocument('projects', docId);

// Get all documents
const allProjects = await this.firestoreService.getAllDocuments('projects');

// Update a document
await this.firestoreService.updateDocument('projects', docId, {
  raised: 40000
});

// Delete a document
await this.firestoreService.deleteDocument('projects', docId);

// Query documents
const techProjects = await this.firestoreService.queryDocuments(
  'projects',
  'category',
  '==',
  'Technology'
);
```

### Storage Service

```typescript
import { StorageService } from './services/storage.service';

// Inject in constructor
constructor(private storageService: StorageService) {}

// Upload a file
const fileInput = event.target as HTMLInputElement;
const file = fileInput.files[0];
const url = await this.storageService.uploadFile('images/project1.jpg', file);

// Get file URL
const downloadURL = await this.storageService.getFileURL('images/project1.jpg');

// Delete a file
await this.storageService.deleteFile('images/project1.jpg');

// List files
const files = await this.storageService.listFiles('images/');
```

## 🔐 Security Rules (Important!)

Before going to production, update your Firestore and Storage security rules:

### Firestore Rules (Basic Example)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### Storage Rules (Basic Example)
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## 📝 Next Steps

1. **Add your Firebase credentials** to the environment files
2. **Enable the services** you need in Firebase Console
3. **Test the services** by using them in your components
4. **Set up proper security rules** before deploying to production

## 🎯 Example: Store Projects in Firestore

You can now replace the hardcoded projects array in your home component with Firestore data:

```typescript
async ngOnInit() {
  this.projects = await this.firestoreService.getAllDocuments('projects');
}
```

Firebase is now fully configured and ready to use in your Fund-It application! 🎉

