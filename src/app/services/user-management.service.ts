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

  private async execute<T>(method: ExecutionMethod, path: string, payload?: object): Promise<T> {
    const execution = await this.functions.createExecution({
      functionId: this.functionId,
      method,
      xpath: path,
      body: payload ? JSON.stringify(payload) : undefined
    });

    return this.parseExecutionResponse<T>(execution);
  }

  async listUsers() {
    const response = await this.execute<ManagedUserListResponse>(ExecutionMethod.GET, '/users');
    const normalized = (response.users ?? []).map(user => ({
      ...user,
      labels: Array.isArray(user.labels) ? user.labels.filter(Boolean) : []
    }));
    return { users: normalized };
  }

  async createUser(payload: CreateUserPayload) {
    const response = await this.execute<CreateUserResponse>(ExecutionMethod.POST, '/users', payload);

    if (!response.user) {
      throw new Error(response.message ?? 'User creation failed.');
    }

    return {
      ...response.user,
      labels: Array.isArray(response.user.labels) ? response.user.labels.filter(Boolean) : []
    };
  }

  async updateUser(payload: UpdateUserPayload) {
    const { userId, ...rest } = payload;
    const normalizedId = userId?.trim();

    if (!normalizedId) {
      throw new Error('User ID is required to update an existing user.');
    }

    const body: Record<string, unknown> = {};

    if (rest.name !== undefined) {
      body['name'] = rest.name;
    }
    if (rest.email !== undefined) {
      body['email'] = rest.email;
    }
    if (rest.password !== undefined) {
      body['password'] = rest.password;
    }
    if (rest.labels !== undefined) {
      body['labels'] = rest.labels;
    }

    if (!Object.keys(body).length) {
      throw new Error('At least one field is required to update the user.');
    }

    const response = await this.execute<UpdateUserResponse>(
      ExecutionMethod.PATCH,
      `/users/${normalizedId}`,
      body
    );

    if (!response.user) {
      throw new Error(response.message ?? 'User update failed.');
    }

    return {
      ...response.user,
      labels: Array.isArray(response.user.labels) ? response.user.labels.filter(Boolean) : []
    };
  }
}
