import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Observable } from 'rxjs';

export const authGuard = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return new Observable<boolean>((observer) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        observer.next(true);
      } else {
        router.navigate(['/login']);
        observer.next(false);
      }
    });

    return () => unsubscribe();
  });
};

