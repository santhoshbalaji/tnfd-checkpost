import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckpostListStore } from '../../services/checkpost-list.store';
import { ManagedUser, UserManagementService } from '../../services/user-management.service';

interface Feedback {
  type: 'success' | 'error';
  message: string;
}

@Component({
  selector: 'app-user-statistics',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule],
  templateUrl: './user-statistics.html',
  styleUrls: ['./user-statistics.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserStatisticsPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserManagementService);
  private readonly checkpostStore = inject(CheckpostListStore);

  readonly users = signal<ManagedUser[]>([]);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly feedback = signal<Feedback | null>(null);
  readonly editingUser = signal<ManagedUser | null>(null);
  readonly selectedCircles = signal<string[]>([]);
  private readonly dateFormatter = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  readonly userForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    confirmPassword: ['']
  });

  readonly circleOptions = computed(() => this.checkpostStore.circles().map(circle => circle.name));
  readonly hasUsers = computed(() => this.users().length > 0);

  ngOnInit() {
    void this.checkpostStore.loadCheckposts();
    void this.loadUsers();
  }

  async loadUsers() {
    this.isLoading.set(true);
    try {
      const response = await this.userService.listUsers();
      this.users.set(response.users);
    } catch (error) {
      this.setFeedback('error', this.extractError(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  async handleSave() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const { name, email, password, confirmPassword } = this.userForm.value;
    const trimmedPassword = (password ?? '').trim();
    const trimmedConfirm = (confirmPassword ?? '').trim();

    if (trimmedPassword && trimmedPassword !== trimmedConfirm) {
      this.setFeedback('error', 'Passwords do not match.');
      return;
    }

    const normalizedName = (name ?? '').trim();
    const normalizedEmail = (email ?? '').trim();

    if (!normalizedName || !normalizedEmail) {
      this.setFeedback('error', 'Name and email are required.');
      return;
    }

    const labels = this.selectedCircles();

    try {
      this.isSaving.set(true);
      const editingUser = this.editingUser();
      if (editingUser) {
        const userId = editingUser.$id?.trim();
        if (!userId) {
          this.setFeedback('error', 'The selected user could not be identified. Please refresh and try again.');
          return;
        }

        await this.userService.updateUser({
          userId,
          name: normalizedName,
          email: normalizedEmail,
          labels,
          password: trimmedPassword || undefined
        });
        this.setFeedback('success', 'User updated successfully.');
      } else {
        if (!trimmedPassword) {
          this.setFeedback('error', 'Password is required for new users.');
          return;
        }
        await this.userService.createUser({
          email: normalizedEmail,
          name: normalizedName,
          password: trimmedPassword,
          labels
        });
        this.setFeedback('success', 'User created successfully.');
      }

      await this.loadUsers();
      this.resetForm();
    } catch (error) {
      this.setFeedback('error', this.extractError(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  startEditing(user: ManagedUser) {
    this.editingUser.set(user);
    this.selectedCircles.set([...user.labels]);
    this.userForm.patchValue({
      name: user.name ?? '',
      email: user.email ?? '',
      password: '',
      confirmPassword: ''
    });
  }

  resetForm() {
    this.editingUser.set(null);
    this.selectedCircles.set([]);
    this.userForm.reset({
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
  }

  toggleCircle(circle: string) {
    this.selectedCircles.update(current => {
      if (current.includes(circle)) {
        return current.filter(entry => entry !== circle);
      }
      return [...current, circle];
    });
  }

  dismissFeedback() {
    this.feedback.set(null);
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

  private extractError(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unable to reach the user management service.';
  }

  private setFeedback(type: Feedback['type'], message: string) {
    this.feedback.set({ type, message });
  }
}
