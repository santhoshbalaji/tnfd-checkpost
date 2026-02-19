import { Injectable, signal, computed } from '@angular/core';
import { Account, Client, Models } from 'appwrite';
import { appwriteConfig } from '../appwrite-config';

@Injectable({
  providedIn: 'root'
})
export class AppwriteAuthService {
  private readonly account: Account;
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly sessionActive = signal(false);
  readonly user = signal<Models.User<Models.Preferences> | null>(null);
  readonly isReady = signal(false);

  readonly userName = computed(() => this.user()?.name ?? 'User');
  readonly userEmail = computed(() => this.user()?.email ?? '');

  constructor() {
    const client = new Client()
      .setEndpoint(appwriteConfig.endpoint)
      .setProject(appwriteConfig.projectId);

    this.account = new Account(client);
    this.checkSession();
  }

  private async checkSession() {
    try {
      const user = await this.account.get();
      this.user.set(user);
      this.sessionActive.set(true);
    } catch {
      this.user.set(null);
      this.sessionActive.set(false);
    } finally {
      this.isReady.set(true);
    }
  }

  async login(email: string, password: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      await this.account.createEmailPasswordSession({
        email,
        password
      });
      const user = await this.account.get();
      this.user.set(user);
      this.sessionActive.set(true);
    } catch (error) {
      this.sessionActive.set(false);
      this.user.set(null);
      this.error.set(this.normalizeError(error));
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  async logout(): Promise<void> {
    this.isLoading.set(true);
    try {
      await this.account.deleteSession('current');
      this.user.set(null);
      this.sessionActive.set(false);
    } catch (error) {
      this.error.set(this.normalizeError(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  async refreshSession(): Promise<void> {
    try {
      const user = await this.account.get();
      this.user.set(user);
      this.sessionActive.set(true);
    } catch (error) {
      this.user.set(null);
      this.sessionActive.set(false);
      this.error.set(this.normalizeError(error));
    }
  }

  private normalizeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'object' && error !== null && 'message' in error) {
      return String((error as { message?: string }).message ?? 'Unable to sign in.');
    }

    return 'Unable to reach Appwrite authentication.';
  }
}
