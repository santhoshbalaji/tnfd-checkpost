import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AppwriteAuthService } from '../services/appwrite-auth.service';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';

@Component({
  selector: 'app-login-page',
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, ButtonModule, PasswordModule],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  public readonly auth = inject(AppwriteAuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  get emailControl() {
    return this.form.get('email');
  }

  get passwordControl() {
    return this.form.get('password');
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    try {
      await this.auth.login(
        this.emailControl?.value ?? '',
        this.passwordControl?.value ?? ''
      );
      this.router.navigate(['/home']);
    } catch {
      // error signal already surfaces the failure to the template
    }
  }
}
