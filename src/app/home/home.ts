import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AppwriteAuthService } from '../services/appwrite-auth.service';

@Component({
  selector: 'app-home',
  imports: [CommonModule, NgOptimizedImage, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomePage {
  public readonly auth = inject(AppwriteAuthService);

  async onLogout() {
    try {
      await this.auth.logout();
    } catch {
      // Logout error handled by service signal
    }
  }
}
