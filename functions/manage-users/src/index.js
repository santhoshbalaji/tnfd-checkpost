const sdk = require('node-appwrite');

const ADMIN_EMAIL = 'pmu.gistnfd@gmail.com';

const sanitizeUser = (user) => ({
  $id: user.$id,
  name: user.name,
  email: user.email,
  labels: Array.isArray(user.labels) ? user.labels.filter(Boolean) : [],
  status: user.status,
  registration: user.registration,
  accessedAt: user.accessedAt
});

const parseBody = (payload) => {
  if (!payload) {
    return {};
  }

  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload);
    } catch (error) {
      return {};
    }
  }

  return typeof payload === 'object' ? payload : {};
};

const normalizePath = (value) => {
  if (!value) {
    return '/';
  }

  const raw = value.split('?')[0] || '/';
  if (raw === '' || raw === '/') {
    return '/';
  }

  return raw.replace(/\/+$/, '');
};

const normalizeLabels = (labels) => {
  if (!Array.isArray(labels)) {
    return [];
  }

  return labels
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForUser = async (usersService, userId, attempts = 5) => {
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await usersService.get(userId);
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await delay(300);
      }
    }
  }

  throw lastError ?? new Error('User with the requested ID could not be found.');
};

const getServiceKey = (context) => {
  return (
    context.env?.APPWRITE_FUNCTION_KEY ||
    context.req?.headers?.['x-appwrite-key'] ||
    ''
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

  const usersService = new sdk.Users(client);
  const method = (context.req?.method ?? 'GET').toUpperCase();
  const normalizedPath = normalizePath(context.req?.path);
  const pathSegments =
    normalizedPath === '/' ? [] : normalizedPath.split('/').filter(Boolean);
  const body = parseBody(context.req?.body);
  const hasLabels = Object.prototype.hasOwnProperty.call(body, 'labels');
  const requestedLabels = hasLabels ? body.labels : undefined;

  try {
    if (method === 'GET' && normalizedPath === '/users') {
      const response = await usersService.list();
      const users = (response.users ?? [])
        .filter((user) => user.email !== ADMIN_EMAIL)
        .map(sanitizeUser);
      return context.res.json({ users }, 200);
    }

    if (method === 'POST' && normalizedPath === '/users') {
      const { email, name, password } = body;
      const normalizedName = typeof name === 'string' ? name.trim() : '';
      const normalizedEmail = typeof email === 'string' ? email.trim() : '';
      const normalizedPassword = typeof password === 'string' ? password : '';

      if (!normalizedEmail || !normalizedName || !normalizedPassword) {
        return context.res.json({
          error: 'Email, name, and password are required.'
        }, 400);
      }

      const createdUser = await usersService.create(
        sdk.ID.unique(),
        normalizedEmail,
        undefined,
        normalizedPassword,
        normalizedName
      );

      if (hasLabels) {
        await waitForUser(usersService, createdUser.$id);
        await usersService.updateLabels(
          createdUser.$id,
          normalizeLabels(requestedLabels)
        );
      }

      const refreshedUser = await waitForUser(usersService, createdUser.$id);
      return context.res.json({
        message: 'User created successfully.',
        user: sanitizeUser(refreshedUser)
      }, 200);
    }

    if (
      method === 'PATCH' &&
      pathSegments[0] === 'users' &&
      pathSegments[1]
    ) {
      const userId = pathSegments[1];
      const { name, email, password } = body;
      const emailValue = typeof email === 'string' ? email.trim() : undefined;
      const nameValue = typeof name === 'string' ? name.trim() : undefined;
      const passwordValue = typeof password === 'string' ? password : undefined;
      const hasUpdateFields =
        nameValue !== undefined ||
        emailValue !== undefined ||
        passwordValue !== undefined ||
        hasLabels;

      if (!hasUpdateFields) {
        return context.res.json({
          error: 'At least one field (name, email, password, labels) is required.'
        }, 400);
      }

      if (nameValue !== undefined) {
        await usersService.updateName(userId, nameValue);
      }
      if (emailValue !== undefined) {
        await usersService.updateEmail(userId, emailValue);
      }
      if (passwordValue !== undefined && passwordValue.length) {
        await usersService.updatePassword(userId, passwordValue);
      }

      if (hasLabels) {
        await waitForUser(usersService, userId);
        await usersService.updateLabels(userId, normalizeLabels(requestedLabels));
      }

      const refreshedUser = await waitForUser(usersService, userId);
      return context.res.json({
        message: 'User updated successfully.',
        user: sanitizeUser(refreshedUser)
      }, 200);
    }

    return context.res.json({ error: 'Endpoint not found.' }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to manage user.';
    context.error?.(`User management error: ${message}`);
    return context.res.json({ error: message }, 500);
  }
};