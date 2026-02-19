import { Injectable } from '@angular/core';
import { Client, ExecutionMethod, Functions, Models } from 'appwrite';
import { appwriteConfig } from '../appwrite-config';

export interface ManagedUser {
  $id: string;
  name?: string;
  email?: string;
  labels: string[];
  status: number;
  registration?: string;
  accessedAt?: string;
}

interface ManagedUserListResponse {
  users?: ManagedUser[];
}

interface CreateUserPayload {
  email: string;
  name: string;
  password: string;
  labels?: string[];
}

interface CreateUserResponse {
  user?: ManagedUser;
  message?: string;
}

interface UpdateUserPayload {
  userId: string;
  name?: string;
  email?: string;
  password?: string;
  labels?: string[];
}

interface UpdateUserResponse {
  user?: ManagedUser;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private readonly functions: Functions;
  private readonly functionId: string;

  constructor() {
    const configuredId = appwriteConfig.userManagementFunctionId?.trim();
    if (!configuredId) {
      throw new Error('User management function ID is missing from appwrite.config.json');
    }

    this.functionId = configuredId;

    const client = new Client()
      .setEndpoint(appwriteConfig.endpoint)
      .setProject(appwriteConfig.projectId);

    this.functions = new Functions(client);
  }

  private parseExecutionResponse<T>(execution: Models.Execution): T {
    const raw = execution.responseBody?.trim();
    if (!raw) {
      return {} as T;
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed?.error) {
        throw new Error(parsed.error);
      }
      return parsed as T;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Unable to parse user management function response.');
    }
  }

  private async execute<T>(method: ExecutionMethod, payload?: object): Promise<T> {
    const execution = await this.functions.createExecution({
      functionId: this.functionId,
      method,
      body: payload ? JSON.stringify(payload) : undefined
    });

    return this.parseExecutionResponse<T>(execution);
  }

  async listUsers() {
    const response = await this.execute<ManagedUserListResponse>(ExecutionMethod.GET);
    const normalized = (response.users ?? []).map(user => ({
      ...user,
      labels: Array.isArray(user.labels) ? user.labels.filter(Boolean) : []
    }));
    return { users: normalized };
  }

  async createUser(payload: CreateUserPayload) {
    const response = await this.execute<CreateUserResponse>(ExecutionMethod.POST, {
      action: 'create',
      ...payload
    });

    if (!response.user) {
      throw new Error(response.message ?? 'User creation failed.');
    }

    return {
      ...response.user,
      labels: Array.isArray(response.user.labels) ? response.user.labels.filter(Boolean) : []
    };
  }

  async updateUser(payload: UpdateUserPayload) {
    const response = await this.execute<UpdateUserResponse>(ExecutionMethod.POST, {
      action: 'update',
      ...payload
    });

    if (!response.user) {
      throw new Error(response.message ?? 'User update failed.');
    }

    return {
      ...response.user,
      labels: Array.isArray(response.user.labels) ? response.user.labels.filter(Boolean) : []
    };
  }
}
