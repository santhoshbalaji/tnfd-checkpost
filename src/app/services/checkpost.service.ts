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

export interface SeizedItemData {
  $id: string;
  name: string;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CheckpostService {
  private readonly databases: Databases;
  private readonly DATABASE_ID = 'main'; // You may need to create this in Appwrite
  private readonly COLLECTION_ID = 'checkposts'; // You may need to create this in Appwrite
  private readonly CASES_COLLECTION = 'cases';
  private readonly DAILY_LOGS_COLLECTION = 'daily_logs';
  private readonly SEIZED_ITEMS_COLLECTION = 'seized_items';

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
        this.DAILY_LOGS_COLLECTION,
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
        this.CASES_COLLECTION,
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
        this.DAILY_LOGS_COLLECTION,
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
        this.CASES_COLLECTION,
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
        this.DAILY_LOGS_COLLECTION,
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
        this.DAILY_LOGS_COLLECTION,
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
        this.CASES_COLLECTION,
        [Query.equal('logId', logId)]
      );
    } catch (error) {
      console.error('Error fetching cases:', error);
      throw error;
    }
  }

  async getSeizedItems(limit: number = 100) {
    try {
      return await this.databases.listDocuments(
        this.DATABASE_ID,
        this.SEIZED_ITEMS_COLLECTION,
        [Query.limit(limit)]
      );
    } catch (error) {
      console.error('Error fetching seized items:', error);
      throw error;
    }
  }

  async createSeizedItem(data: SeizedItemData) {
    try {
      return await this.databases.createDocument(
        this.DATABASE_ID,
        this.SEIZED_ITEMS_COLLECTION,
        ID.unique(),
        data
      );
    } catch (error) {
      console.error('Error creating seized item:', error);
      throw error;
    }
  }
}
