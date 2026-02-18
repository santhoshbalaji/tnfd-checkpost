import { Injectable, inject } from '@angular/core';
import { Client, Databases, ID, Query } from 'appwrite';
import { appwriteConfig } from '../appwrite-config';

export interface CheckpostData {
  name: string;
  circle: string;
  division: string;
  range: string;
  address: string;
  phoneNumber: string;
  latitude: number;
  longitude: number;
  othersDetails: string;
}

@Injectable({
  providedIn: 'root'
})
export class CheckpostService {
  private readonly databases: Databases;
  private readonly DATABASE_ID = 'main'; // You may need to create this in Appwrite
  private readonly COLLECTION_ID = 'checkposts'; // You may need to create this in Appwrite

  constructor() {
    const client = new Client()
      .setEndpoint(appwriteConfig.endpoint)
      .setProject(appwriteConfig.projectId);

    this.databases = new Databases(client);
  }

  async getCheckposts(limit: number = 100) {
    try {
      return await this.databases.listDocuments(
        this.DATABASE_ID,
        this.COLLECTION_ID,
        [Query.limit(limit)]
      );
    } catch (error) {
      console.error('Error fetching checkposts:', error);
      throw error;
    }
  }

  async getCheckpost(id: string) {
    try {
      return await this.databases.getDocument(
        this.DATABASE_ID,
        this.COLLECTION_ID,
        id
      );
    } catch (error) {
      console.error('Error fetching checkpost:', error);
      throw error;
    }
  }

  async createCheckpost(data: CheckpostData) {
    try {
      return await this.databases.createDocument(
        this.DATABASE_ID,
        this.COLLECTION_ID,
        ID.unique(),
        data
      );
    } catch (error) {
      console.error('Error creating checkpost:', error);
      throw error;
    }
  }

  // Daily Logs & Cases
  async createDailyLog(data: any) {
    try {
      return await this.databases.createDocument(
        this.DATABASE_ID,
        'daily_logs',
        ID.unique(),
        data
      );
    } catch (error) {
      console.error('Error creating daily log:', error);
      throw error;
    }
  }

  async createCase(data: any) {
    try {
      return await this.databases.createDocument(
        this.DATABASE_ID,
        'cases',
        ID.unique(),
        data
      );
    } catch (error) {
      console.error('Error creating case:', error);
      throw error;
    }
  }

  async updateDailyLog(logId: string, data: any) {
    try {
      return await this.databases.updateDocument(
        this.DATABASE_ID,
        'daily_logs',
        logId,
        data
      );
    } catch (error) {
      console.error('Error updating daily log:', error);
      throw error;
    }
  }

  async updateCase(caseId: string, data: any) {
    try {
      return await this.databases.updateDocument(
        this.DATABASE_ID,
        'cases',
        caseId,
        data
      );
    } catch (error) {
      console.error('Error updating case:', error);
      throw error;
    }
  }

  async getDailyLog(logId: string) {
    try {
      return await this.databases.getDocument(
        this.DATABASE_ID,
        'daily_logs',
        logId
      );
    } catch (error) {
      console.error('Error fetching daily log:', error);
      throw error;
    }
  }

  async getDailyLogs(checkpostId: string) {
    try {
      return await this.databases.listDocuments(
        this.DATABASE_ID,
        'daily_logs',
        [
          Query.equal('checkpostId', checkpostId),
          Query.orderDesc('logDate')
        ]
      );
    } catch (error) {
      console.error('Error fetching daily logs:', error);
      throw error;
    }
  }

  async getCasesForLog(logId: string) {
    try {
      return await this.databases.listDocuments(
        this.DATABASE_ID,
        'cases',
        [Query.equal('logId', logId)]
      );
    } catch (error) {
      console.error('Error fetching cases:', error);
      throw error;
    }
  }
}
