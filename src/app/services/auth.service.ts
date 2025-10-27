
import { Injectable } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User,
  onAuthStateChanged
} from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$: Observable<User | null>;
  private readonly EDIT_ACCESS_EMAILS = ['ramsatt@gmail.com', 'codingpullingo@gmail.com'];

  constructor(private auth: Auth) {
    this.user$ = new Observable((subscriber) => {
      onAuthStateChanged(this.auth, (user) => {
        subscriber.next(user);
      });
    });
  }

  // Sign in with email and password
  async signIn(email: string, password: string) {
    try {
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      return result;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  // Sign up with email and password
  async signUp(email: string, password: string) {
    try {
      const result = await createUserWithEmailAndPassword(this.auth, email, password);
      return result;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  // Sign in with Google
  async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      return result;
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  }

  // Sign out
  async logout() {
    try {
      await signOut(this.auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  // Get user display name
  getUserDisplayName(): string {
    const user = this.getCurrentUser();
    if (!user) {
      return 'Guest';
    }
    // Try displayName first (from Google Sign-In), then email, then 'User'
    return user.displayName || user.email?.split('@')[0] || 'User';
  }

  // Get user email
  getUserEmail(): string | null {
    const user = this.getCurrentUser();
    return user?.email || null;
  }

  // Get user photo URL
  getUserPhotoURL(): string | null {
    const user = this.getCurrentUser();
    return user?.photoURL || null;
  }

  // Check if current user has edit access
  hasEditAccess(): boolean {
    const user = this.getCurrentUser();
    if (!user || !user.email) {
      return false;
    }
    return this.EDIT_ACCESS_EMAILS.includes(user.email.toLowerCase());
  }

  // Check if a specific email has edit access
  checkEditAccessForEmail(email: string | null | undefined): boolean {
    if (!email) {
      return false;
    }
    return this.EDIT_ACCESS_EMAILS.includes(email.toLowerCase());
  }
}
