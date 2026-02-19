import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { AppwriteAuthService } from '../../services/appwrite-auth.service';

type Feedback = {
  type: 'success' | 'error';
  message: string;
};

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserProfilePage {
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AppwriteAuthService);
  readonly isSubmitting = signal(false);
  readonly feedback = signal<Feedback | null>(null);
  readonly passwordForm = this.fb.group({
    currentPassword: [''],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  });

  private readonly dateFormatter = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  readonly hasCircles = computed(() => this.auth.circleLabels().length > 0);

  async handlePasswordUpdate() {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;
    const trimmedCurrent = (currentPassword ?? '').trim();
    const trimmedNew = (newPassword ?? '').trim();
    const trimmedConfirm = (confirmPassword ?? '').trim();

    if (trimmedNew !== trimmedConfirm) {
      this.setFeedback('error', 'New passwords must match.');
      return;
    }

    if (trimmedNew.length < 8) {
      this.setFeedback('error', 'Password must be at least 8 characters.');
      return;
    }

    try {
      this.isSubmitting.set(true);
      await this.auth.changePassword(trimmedNew, trimmedCurrent || undefined);
      this.setFeedback('success', 'Password updated successfully.');
      this.passwordForm.reset({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      this.setFeedback('error', this.normalizeError(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  formatTimestamp(value?: string) {
    if (!value) {
      return 'Not available';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Not available';
    }

    return this.dateFormatter.format(date);
  }

  private normalizeError(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'object' && error !== null && 'message' in error) {
      return String((error as { message?: string }).message ?? 'Unable to change password.');
    }

    return 'Unable to change password.';
  }

  private setFeedback(type: Feedback['type'], message: string) {
    this.feedback.set({ type, message });
  }
}
