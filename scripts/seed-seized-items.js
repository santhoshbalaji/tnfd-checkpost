const { Client, Databases, ID, Query } = require('appwrite');
const config = require('../appwrite.config.json');

const DEFAULT_ITEMS = [
  {
    name: 'Currency / Cash',
    description: 'Cash, coins, and negotiable instruments seized during inspections.'
  },
  {
    name: 'Forest Produce / Timber',
    description: 'Wood, timber, medicinal herbs, resin, and related forestry products.'
  },
  {
    name: 'Wildlife Products',
    description: 'Ivory, skins, trophies, and other wildlife artefacts subject to regulation.'
  },
  {
    name: 'Vehicles / Machinery',
    description: 'Vehicles, trailers, or heavy equipment impounded during enforcement actions.'
  },
  {
    name: 'Electronic Equipment',
    description: 'Radios, phones, GPS units, and other electronic goods seized during checks.'
  }
];

const databaseId = config.tablesDB?.[0]?.$id ?? 'main';
const client = new Client().setEndpoint(config.endpoint).setProject(config.projectId);
const databases = new Databases(client);

async function ensureItems() {
  console.log('Seeding seized_items collection for project', config.projectName || config.projectId);
  const { documents = [] } = await databases.listDocuments(databaseId, 'seized_items', [Query.limit(DEFAULT_ITEMS.length * 3)]);
  const lowercased = new Set(documents.map(doc => (doc.name || '').trim().toLowerCase()));

  const created = [];
  for (const item of DEFAULT_ITEMS) {
    if (lowercased.has(item.name.toLowerCase())) {
      continue;
    }
    const createdDoc = await databases.createDocument(databaseId, 'seized_items', ID.unique(), item);
    created.push(createdDoc);
    console.log(`Created seized item "${item.name}" (id: ${createdDoc.$id}).`);
  }

  if (!created.length) {
    console.log('No new seized items were created; all defaults already exist.');
  }
}

ensureItems()
  .then(() => console.log('Seized items seeding complete.'))
  .catch(error => {
    console.error('Failed to seed seized items:', error);
    process.exit(1);
  });
