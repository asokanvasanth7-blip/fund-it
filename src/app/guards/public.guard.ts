import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Observable } from 'rxjs';

export const publicGuard = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return new Observable<boolean>((observer) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // User is logged in, redirect to home
        router.navigate(['/']);
        observer.next(false);
      } else {
        // User is not logged in, allow access to login page
        observer.next(true);
      }
    });

    return () => unsubscribe();
  });
};

