# Or PowerShell Script
.\build-android.ps1

# Or NPM Script
npm run run:android
```

#### Option 2: Manual Commands
```bash
# Build Angular app
ng build --configuration production

# Sync with Android
npx cap sync android

# Open in Android Studio
npx cap open android
```

### Prerequisites for Android Build
- **Android Studio**: Download from https://developer.android.com/studio
- **Java Development Kit (JDK)**: JDK 17 recommended
- **Android SDK**: Installed via Android Studio

### Build APK in Android Studio
1. Wait for Gradle sync to complete
2. Click **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. Find APK at: `android/app/build/outputs/apk/debug/app-debug.apk`

### For Production Release
1. Click **Build** → **Generate Signed Bundle / APK**
2. Create/use keystore (SAVE IT SAFELY!)
3. Find at: `android/app/build/outputs/apk/release/app-release.apk`

### Documentation
- **Quick Start**: See `ANDROID-QUICKSTART.md`
- **Full Guide**: See `ANDROID-BUILD.md` for comprehensive documentation

### Android App Configuration
- **App ID**: com.fundit.app
- **App Name**: Fund-It
- **Installed Plugins**: Status Bar, Splash Screen

# Fund IT - Ammuvadi Fund Management System

A comprehensive web-based fund management system for managing member accounts, tracking fund collections, processing loan payments, and monitoring due schedules. Built with Angular 20.3.6 and Firebase.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Firebase Setup](#firebase-setup)
- [Development](#development)
- [Project Structure](#project-structure)
- [Components](#components)
- [Services](#services)
- [Security](#security)
- [Deployment](#deployment)

## 🎯 Overview

Fund IT (Kannakuthe) is an Ammuvadi fund management application designed to streamline the management of community fund operations. The system enables administrators to:

- Manage member accounts with auto-generated account numbers
- Track monthly fund contributions and loan amounts
- Collect payments with automated receipt generation
- Monitor 24-month payment schedules
- Update due amounts and loan interest rates
- Generate detailed payment reports

## ✨ Features

### 1. **Account Management** 👥
- View all member accounts with detailed information
- Add new accounts with auto-generated account numbers (AZH-001, AZH-002, etc.)
- Track fund amounts and loan amounts for each member
- Real-time statistics (total members, total fund amount, total loans)
- Search and filter accounts

### 2. **Payment Collection** 💳
- Record monthly payments from members
- Smart payment collection (only enabled for current month dues)
- Support for partial payments
- Multiple payment methods (Cash, Bank Transfer, UPI, Cheque, Card)
- Automated receipt generation with PDF export
- Payment history tracking

### 3. **Due Schedule Management** 📅
- Automated 24-month payment schedule for each account
- Track pending, paid, partial, and overdue payments
- Visual status indicators
- Balance amount tracking
- Due date monitoring

### 4. **Update Due Details** ✏️
- Modify due amounts for specific payments
- Update loan interest rates
- Apply changes to all dues (bulk update feature)
- Real-time total calculation

### 5. **Update Loan Details** 💰
- Manage fund amounts for members
- Update loan amounts
- Net balance calculation (Fund - Loan)
- Visual cards with color-coded balances

### 6. **Data Upload** 📤
- Import account details from JSON files
- Import due schedules from JSON files
- Bulk upload to Firebase
- Data validation and error handling

### 7. **Authentication & Security** 🔐
- Firebase Authentication integration
- Protected routes with auth guards
- Public routes for login
- Session management
- Automatic logout functionality

### 8. **Modern UI/UX** 🎨
- Responsive sidebar navigation
- Collapsible menu for mobile devices
- Professional gradient designs
- Interactive cards and animations
- Search functionality across components
- Real-time data updates

## 🛠 Technology Stack

### Frontend
- **Angular**: 20.3.6
- **TypeScript**: Latest
- **Bootstrap**: 5.x (for grid and utilities)
- **RxJS**: For reactive programming

### Backend & Database
- **Firebase Firestore**: NoSQL database
- **Firebase Authentication**: User authentication
- **Firebase Storage**: File storage (if needed)

### Additional Libraries
- **jsPDF**: PDF generation for receipts
- **jsPDF-AutoTable**: Table generation in PDFs

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **Angular CLI**: v20.x or higher

```bash
npm install -g @angular/cli@20
```

## 🚀 Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd fund-it
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure Firebase**

Create a `src/environments/environment.ts` file:

```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
  }
};
```

Create a `src/environments/environment.prod.ts` file:

```typescript
export const environment = {
  production: true,
  firebase: {
    // Your production Firebase config
  }
};
```

4. **Start the development server**
```bash
ng serve
```

Navigate to `http://localhost:4200/`

## 🔥 Firebase Setup

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Follow the setup wizard

### 2. Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click "Get Started"
3. Enable **Email/Password** authentication

### 3. Create Firestore Database

1. Go to **Firestore Database**
2. Click "Create database"
3. Choose "Start in test mode" (or production mode with security rules)
4. Select a location

### 4. Set Up Collections

Create the following collections in Firestore:

#### `accountDetails` Collection
```json
{
  "account": "AZH-001",
  "name": "John Doe",
  "fund_amount": 1000.00,
  "loan_amount": 500.00,
  "due_payments": [
    {
      "due_no": 1,
      "due_date": "21 Oct 2025",
      "due_amount": 1000.00,
      "loan_interest": 0.00,
      "total": 1000.00,
      "paid_amount": 0.00,
      "balance_amount": 1000.00,
      "payment_status": "pending"
    }
    // ... 23 more payment entries
  ]
}
```

### 5. Security Rules

Add security rules in Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /accountDetails/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 💻 Development

### Development Server

Run the development server:

```bash
ng serve
```

The app will automatically reload if you change any source files.

### Code Scaffolding

Generate a new component:

```bash
ng generate component component-name
```

Generate a service:

```bash
ng generate service service-name
```

### Building

Build the project for production:

```bash
ng build --configuration production
```

The build artifacts will be stored in the `dist/` directory.

## 📁 Project Structure

```
fund-it/
├── src/
│   ├── app/
│   │   ├── account-details/          # Account management component
│   │   ├── data-upload/              # Data upload component
│   │   ├── due-schedule/             # Due schedule component
│   │   ├── guards/                   # Route guards
│   │   │   ├── auth.guard.ts         # Authentication guard
│   │   │   └── public.guard.ts       # Public route guard
│   │   ├── home/                     # Home page component
│   │   ├── login/                    # Login component
│   │   ├── models/                   # TypeScript interfaces
│   │   │   ├── account-details.model.ts
│   │   │   └── due-schedule.model.ts
│   │   ├── payment-collection/       # Payment collection component
│   │   ├── services/                 # Angular services
│   │   │   ├── auth.service.ts       # Authentication service
│   │   │   ├── firestore.service.ts  # Firestore operations
│   │   │   └── storage.service.ts    # Firebase storage
│   │   ├── update-due-details/       # Update dues component
│   │   ├── update-loan-details/      # Update loan component
│   │   ├── app.config.ts             # App configuration
│   │   ├── app.routes.ts             # Routing configuration
│   │   ├── app.html                  # Root template
│   │   ├── app.ts                    # Root component
│   │   └── app.css                   # Root styles
│   ├── assets/                       # Static assets
│   │   ├── account-details.mock.json
│   │   └── due-schedule.mock.json
│   ├── environments/                 # Environment configs
│   │   ├── environment.ts
│   │   └── environment.prod.ts
│   ├── index.html                    # Main HTML file
│   ├── main.ts                       # Application entry point
│   └── styles.css                    # Global styles
├── angular.json                      # Angular configuration
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript configuration
└── README.md                         # This file
```

## 🧩 Components

### Home Component
- Dashboard with feature cards
- Real-time statistics (total members, fund amount, loans)
- Quick navigation to main features
- Feature showcase section

### Account Details Component
- List all member accounts
- Search and filter functionality
- Add new accounts with auto-generated IDs
- View detailed payment schedules
- Generate payment receipts

### Payment Collection Component
- Select account and due payment
- Smart button (enabled only for current month)
- Record payment with multiple methods
- Support partial payments
- Auto-generate and download receipts

### Due Schedule Component
- View all accounts and their payment schedules
- Filter by payment status
- Track pending, paid, partial, and overdue payments
- Visual status indicators

### Update Due Details Component
- Edit due amounts for specific payments
- Update loan interest rates
- Apply changes to all dues (bulk update)
- Real-time calculations

### Update Loan Details Component
- Manage fund and loan amounts
- Visual cards with net balance
- Color-coded positive/negative balances
- Real-time Firebase sync

### Data Upload Component
- Upload account details from JSON
- Upload due schedules from JSON
- Bulk import to Firebase
- Progress tracking

### Login Component
- Email/password authentication
- Firebase integration
- Form validation
- Error handling

## 🔧 Services

### AuthService
- User authentication (login/logout)
- User session management
- Observable user state
- Route protection

### FirestoreService
- CRUD operations for Firestore
- Collection management
- Document queries
- Batch operations

### StorageService
- File upload to Firebase Storage
- File download
- File deletion

## 🔒 Security

### Route Guards

**Auth Guard** (`auth.guard.ts`)
- Protects authenticated routes
- Redirects to login if not authenticated
- Applied to: Home, Accounts, Payments, Due Schedule, Updates, Upload

**Public Guard** (`public.guard.ts`)
- Protects login page
- Redirects to home if already authenticated

### Firebase Security Rules

```javascript
// Firestore Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}

// Storage Rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 📝 Usage Examples

### Adding a New Account

1. Navigate to **Account Details** page
2. Click **+ Add New Account** button
3. Enter the member's name
4. Click **Create Account**
5. System automatically:
   - Generates account number (e.g., AZH-005)
   - Sets fund and loan amounts to 0
   - Creates 24 monthly payment entries

### Collecting a Payment

1. Navigate to **Payment Collection** page
2. Search and select an account
3. Click **💰 Collect Payment** for current month due
4. Enter payment details:
   - Payment amount
   - Payment date
   - Payment method
   - Notes (optional)
5. Click **Save Payment**
6. Download the generated receipt

### Updating Due Amounts

1. Navigate to **Update Due Details** page
2. Select an account
3. Click **Edit** on a payment
4. Modify due amount and/or loan interest
5. Check **Apply to All Dues** to update all 24 payments
6. Click **Save Changes**

### Updating Loan Details

1. Navigate to **Update Loan Details** page
2. Select an account
3. Click **✏️ Edit Loan Details**
4. Update fund amount and/or loan amount
5. View real-time net balance calculation
6. Click **Save Changes**

## 🚢 Deployment

### Build for Production

```bash
ng build --configuration production
```

### Deploy to Firebase Hosting

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase:
```bash
firebase init hosting
```

4. Deploy:
```bash
firebase deploy
```

### Deploy to Other Platforms

The built files in `dist/fund-it/browser/` can be deployed to:
- **Netlify**
- **Vercel**
- **GitHub Pages**
- **AWS S3 + CloudFront**
- Any static hosting service

## 📱 Building for Android

The Fund-IT app can be built as a native Android application using Capacitor.

### Quick Start

#### Option 1: Using Build Scripts (Easiest)
```bash
# Windows Batch Script
build-android.bat

## 🐛 Troubleshooting

### Common Issues

**1. Firebase Configuration Error**
- Ensure `environment.ts` and `environment.prod.ts` have correct Firebase config
- Check Firebase project settings

**2. Authentication Not Working**
- Verify Email/Password authentication is enabled in Firebase Console
- Check Firebase security rules

**3. Data Not Loading**
- Verify Firestore collections exist (`accountDetails`)
- Check Firestore security rules
- Ensure user is authenticated

**4. Build Errors**
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear Angular cache: `ng cache clean`

## 📄 License

This project is licensed under the MIT License.

## 👥 Contributors

Developed for Ammuvadi Fund Management.

## 📞 Support

For issues and questions, please create an issue in the repository.

---

**Version**: 1.0.0  
**Last Updated**: October 22, 2025  
**Angular Version**: 20.3.6  
**Node Version**: 18+
