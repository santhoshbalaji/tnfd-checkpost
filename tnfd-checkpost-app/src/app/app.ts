import { Component, effect, inject, signal } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { AppwriteAuthService } from './services/appwrite-auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('tnfd-checkpost-app');
  private readonly auth = inject(AppwriteAuthService);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      const active = this.auth.sessionActive();
      if (active && this.router.url === '/login') {
        this.router.navigate(['/home']);
      } else if (!active && this.router.url !== '/login') {
        this.router.navigate(['/login']);
      }
    });
  }
}
