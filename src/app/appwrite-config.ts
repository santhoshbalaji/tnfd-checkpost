import rawConfig from '../../appwrite.config.json';

interface RawAppwriteConfig {
  endpoint?: string;
  projectId: string;
  projectName?: string;
}

export interface AppwriteClientConfig {
  endpoint: string;
  projectId: string;
  projectName?: string;
}

const typedConfig = rawConfig as RawAppwriteConfig;

export const appwriteConfig: AppwriteClientConfig = {
  endpoint: typedConfig.endpoint ?? 'https://cloud.appwrite.io/v1',
  projectId: typedConfig.projectId,
  projectName: typedConfig.projectName
};
