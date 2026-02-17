import { Injectable, signal } from '@angular/core';
import { Account, Client } from 'appwrite';
import { appwriteConfig } from '../appwrite-config';

@Injectable({
  providedIn: 'root'
})
export class AppwriteAuthService {
  private readonly account: Account;
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly sessionActive = signal(false);

  constructor() {
    const client = new Client()
      .setEndpoint(appwriteConfig.endpoint)
      .setProject(appwriteConfig.projectId);

    this.account = new Account(client);
  }

  async login(email: string, password: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      await this.account.createEmailPasswordSession({
        email,
        password
      });
      this.sessionActive.set(true);
    } catch (error) {
      this.sessionActive.set(false);
      this.error.set(this.normalizeError(error));
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  async refreshSession(): Promise<void> {
    try {
      await this.account.get();
      this.sessionActive.set(true);
    } catch (error) {
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
