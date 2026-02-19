const sdk = require('node-appwrite');

const sanitizeUser = (user) => ({
  $id: user.$id,
  name: user.name,
  email: user.email,
  labels: Array.isArray(user.labels) ? user.labels : [],
  status: user.status,
  registration: user.registration,
  accessedAt: user.accessedAt
});

const parsePayload = (body) => {
  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body);
  } catch (error) {
    return {};
  }
};

const getServiceKey = (context) => {
  return (
    context.env?.APPWRITE_FUNCTION_KEY || context.req.headers['x-appwrite-key'] || ''
  ).trim();
};

module.exports = async function (context) {
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const serviceKey = getServiceKey(context);

  if (!endpoint || !projectId || !serviceKey) {
    return context.res.json({ error: 'Function is missing configuration.' }, 500);
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(serviceKey);

  const users = new sdk.Users(client);
  const payload = parsePayload(context.req.body);
  const rawAction = (payload.action ?? context.req.method ?? 'get').toString().toLowerCase();

  try {
    if (rawAction === 'get' || rawAction === 'list') {
      const response = await users.list();
      return context.res.json({
        users: response.users
          .filter(user => user.email !== 'pmu.gistnfd@gmail.com')
          .map(sanitizeUser)
      });
    }

    if (rawAction === 'create' || rawAction === 'post') {
      const { email, name, password, labels } = payload;

      if (!email || !name || !password) {
        return context.res.json({ error: 'Email, name, and password are required.' }, 400);
      }

      const user = await users.create(sdk.ID.unique(), email, undefined, password, name);
      const normalizedLabels = Array.isArray(labels) ? labels.filter(Boolean) : [];

      if (normalizedLabels.length) {
        await users.updateLabels(user.$id, normalizedLabels);
      }

      return context.res.json({ message: 'User created successfully.', user: sanitizeUser(user) });
    }

    if (rawAction === 'update' || rawAction === 'patch') {
      const { userId, name, email, password, labels } = payload;

      if (!userId) {
        return context.res.json({ error: 'userId is required for updates.' }, 400);
      }

      if (name !== undefined) {
        await users.updateName(userId, name);
      }

      if (email) {
        await users.updateEmail(userId, email);
      }

      if (password) {
        await users.updatePassword(userId, password);
      }

      if (labels !== undefined) {
        const normalized = Array.isArray(labels) ? labels.filter(Boolean) : [];
        await users.updateLabels(userId, normalized);
      }

      const refreshed = await users.get(userId);
      return context.res.json({ message: 'User updated successfully.', user: sanitizeUser(refreshed) });
    }

    return context.res.json({ error: 'Unsupported action.' }, 405);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to manage user.';
    context.error('User management error: ' + message);
    return context.res.json({ error: message }, 500);
  }
};
