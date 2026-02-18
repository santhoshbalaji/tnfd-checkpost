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
}
