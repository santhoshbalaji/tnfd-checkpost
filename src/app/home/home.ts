import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AppwriteAuthService } from '../services/appwrite-auth.service';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, CardModule, ButtonModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class HomePage {
  public readonly auth = inject(AppwriteAuthService);
  private readonly router = inject(Router);

  // Checks if the current URL has more segments than just /home
  public readonly hasChildRoute = computed(() => {
    return this.router.url !== '/home';
  });

  async onLogout() {
    try {
      await this.auth.logout();
    } catch {
      // Logout error handled by service signal
    }
  }
}
