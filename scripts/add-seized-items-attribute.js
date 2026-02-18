const { Client, Databases } = require('appwrite');
const config = require('../appwrite.config.json');

const client = new Client().setEndpoint(config.endpoint).setProject(config.projectId);
const databases = new Databases(client);
const databaseId = config.tablesDB?.[0]?.$id ?? 'main';
const collectionId = 'cases';
const attributeKey = 'seizedItems';

(async () => {
  console.log('Adding seizedItems attribute to collection', collectionId);
  try {
    await databases.createStringAttribute(databaseId, collectionId, attributeKey, 2000, false);
    console.log('Attribute created');
  } catch (error) {
    console.error('Failed to add attribute:', error);
    process.exit(1);
  }
})();
