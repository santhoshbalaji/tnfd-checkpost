import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AppwriteAuthService } from '../services/appwrite-auth.service';

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class HomePage {
  public readonly auth = inject(AppwriteAuthService);
  private readonly router = inject(Router);

  async onLogout() {
    try {
      await this.auth.logout();
      this.router.navigate(['/']);
    } catch {
      // Logout error handled by service signal
    }
  }
}
