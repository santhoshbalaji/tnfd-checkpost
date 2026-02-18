import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AppwriteAuthService } from '../services/appwrite-auth.service';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ButtonModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
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
