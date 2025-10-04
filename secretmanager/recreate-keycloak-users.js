const axios = require('axios');

const KEYCLOAK_URL = 'http://localhost:8080';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin';
const REALM = 'master';

async function waitForKeycloak() {
  console.log('⏳ Ожидание запуска Keycloak...');
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    try {
      await axios.get(`${KEYCLOAK_URL}/`);
      console.log('✅ Keycloak запущен');
      return true;
    } catch (error) {
      attempts++;
      console.log(`⏳ Попытка ${attempts}/${maxAttempts}...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  throw new Error('Keycloak не запустился в течение 60 секунд');
}

async function getAdminToken() {
  try {
    const response = await axios.post(`${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`, 
      new URLSearchParams({
        grant_type: 'password',
        client_id: 'admin-cli',
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    return response.data.access_token;
  } catch (error) {
    console.error('❌ Ошибка получения токена:', error.response?.data || error.message);
    throw error;
  }
}

async function deleteAllClients(token) {
  try {
    const response = await axios.get(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/clients`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    const clients = response.data.filter(c => 
      c.clientId === 'secretmanager-client' || 
      c.clientId === 'secretmanager-admin' ||
      c.clientId === 'admin-cli'
    );
    
    for (const client of clients) {
      if (client.clientId !== 'admin-cli') {
        console.log(`🗑️ Удаление клиента ${client.clientId}...`);
        await axios.delete(
          `${KEYCLOAK_URL}/admin/realms/${REALM}/clients/${client.id}`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
      }
    }
    
    console.log('✅ Существующие клиенты удалены');
  } catch (error) {
    console.log('ℹ️ Клиенты не найдены или уже удалены');
  }
}

async function deleteAllUsers(token) {
  try {
    const response = await axios.get(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/users`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    const users = response.data.filter(u => 
      u.username === 'admin-user' || 
      u.username === 'test-user' ||
      u.username === 'approver-user'
    );
    
    for (const user of users) {
      console.log(`🗑️ Удаление пользователя ${user.username}...`);
      await axios.delete(
        `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${user.id}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
    }
    
    console.log('✅ Существующие пользователи удалены');
  } catch (error) {
    console.log('ℹ️ Пользователи не найдены или уже удалены');
  }
}

async function deleteAllRoles(token) {
  try {
    const response = await axios.get(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/roles`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    const roles = response.data.filter(r => 
      r.name === 'admin' || 
      r.name === 'approver' || 
      r.name === 'user'
    );
    
    for (const role of roles) {
      console.log(`🗑️ Удаление роли ${role.name}...`);
      await axios.delete(
        `${KEYCLOAK_URL}/admin/realms/${REALM}/roles/${role.name}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
    }
    
    console.log('✅ Существующие роли удалены');
  } catch (error) {
    console.log('ℹ️ Роли не найдены или уже удалены');
  }
}

async function createClient(clientId, token) {
  const clientConfig = {
    clientId: clientId,
    name: `${clientId} Client`,
    description: `Client for ${clientId}`,
    enabled: true,
    clientAuthenticatorType: 'client-secret',
    secret: 'your-client-secret',
    standardFlowEnabled: true,
    implicitFlowEnabled: false,
    directAccessGrantsEnabled: true,
    serviceAccountsEnabled: true,
    publicClient: true,
    protocol: 'openid-connect',
    attributes: {
      'exclude.session.state.from.auth.response': 'false',
      'saml.assertion.signature': 'false',
      'saml.force.post.binding': 'false',
      'saml.multivalued.roles': 'false',
      'saml.encrypt': 'false',
      'saml.server.signature': 'false',
      'saml.server.signature.keyinfo.ext': 'false',
      'exclude.session.state.from.auth.response': 'false',
      'saml_force_name_id_format': 'false',
      'saml.client.signature': 'false',
      'tls.client.certificate.bound.access.tokens': 'false',
      'saml.authnstatement': 'false',
      'display.on.consent.screen': 'false',
      'saml.onetimeuse.condition': 'false'
    },
    redirectUris: [
      `http://localhost:3000/*`,
      `http://localhost:3001/*`,
      `http://localhost:3000/silent-check-sso.html`,
      `http://localhost:3001/silent-check-sso.html`
    ],
    webOrigins: [
      `http://localhost:3000`,
      `http://localhost:3001`
    ],
    defaultClientScopes: [
      'web-origins',
      'role_list',
      'profile',
      'roles',
      'email'
    ],
    optionalClientScopes: [
      'address',
      'phone',
      'offline_access',
      'microprofile-jwt'
    ]
  };

  try {
    await axios.post(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/clients`,
      clientConfig,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    console.log(`✅ Клиент ${clientId} создан`);
  } catch (error) {
    console.error(`❌ Ошибка создания клиента ${clientId}:`, error.response?.data || error.message);
    throw error;
  }
}

async function createRoles(token) {
  const roles = [
    { name: 'admin', description: 'Administrator role with full access' },
    { name: 'approver', description: 'Approver role for managing requests' },
    { name: 'user', description: 'Regular user role' }
  ];
  
  for (const role of roles) {
    try {
      await axios.post(
        `${KEYCLOAK_URL}/admin/realms/${REALM}/roles`,
        role,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      console.log(`✅ Роль ${role.name} создана`);
    } catch (error) {
      console.error(`❌ Ошибка создания роли ${role.name}:`, error.response?.data || error.message);
    }
  }
}

async function createUser(userData, token) {
  try {
    await axios.post(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/users`,
      userData,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    console.log(`✅ Пользователь ${userData.username} создан`);
    
    // Получаем ID пользователя
    const usersResponse = await axios.get(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/users?username=${userData.username}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    const user = usersResponse.data[0];
    if (user && userData.roles) {
      // Назначаем роли
      for (const roleName of userData.roles) {
        try {
          const roleResponse = await axios.get(
            `${KEYCLOAK_URL}/admin/realms/${REALM}/roles/${roleName}`,
            {
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );
          
          await axios.post(
            `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${user.id}/role-mappings/realm`,
            [roleResponse.data],
            {
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );
          console.log(`✅ Роль ${roleName} назначена пользователю ${userData.username}`);
        } catch (error) {
          console.error(`❌ Ошибка назначения роли ${roleName}:`, error.response?.data || error.message);
        }
      }
    }
    
  } catch (error) {
    console.error(`❌ Ошибка создания пользователя ${userData.username}:`, error.response?.data || error.message);
  }
}

async function main() {
  try {
    console.log('🔐 Пересоздание всех пользователей Keycloak...\n');
    
    // Ждем запуска Keycloak
    await waitForKeycloak();
    
    console.log('\n1️⃣ Получение токена администратора...');
    const token = await getAdminToken();
    console.log('✅ Токен получен\n');
    
    console.log('2️⃣ Удаление всех существующих данных...');
    await deleteAllClients(token);
    await deleteAllUsers(token);
    await deleteAllRoles(token);
    
    console.log('\n3️⃣ Создание ролей...');
    await createRoles(token);
    
    console.log('\n4️⃣ Создание клиентов...');
    await createClient('secretmanager-client', token);
    await createClient('secretmanager-admin', token);
    
    console.log('\n5️⃣ Создание пользователей...');
    
    // Администратор
    await createUser({
      username: 'admin-user',
      email: 'admin@secretmanager.com',
      firstName: 'Admin',
      lastName: 'User',
      enabled: true,
      emailVerified: true,
      credentials: [{
        type: 'password',
        value: 'admin123',
        temporary: false
      }],
      roles: ['admin', 'approver', 'user']
    }, token);
    
    // Одобряющий
    await createUser({
      username: 'approver-user',
      email: 'approver@secretmanager.com',
      firstName: 'Approver',
      lastName: 'User',
      enabled: true,
      emailVerified: true,
      credentials: [{
        type: 'password',
        value: 'approver123',
        temporary: false
      }],
      roles: ['approver', 'user']
    }, token);
    
    // Обычный пользователь
    await createUser({
      username: 'test-user',
      email: 'user@secretmanager.com',
      firstName: 'Test',
      lastName: 'User',
      enabled: true,
      emailVerified: true,
      credentials: [{
        type: 'password',
        value: 'user123',
        temporary: false
      }],
      roles: ['user']
    }, token);
    
    console.log('\n🎉 Пересоздание пользователей завершено!');
    console.log('\n📋 Информация для входа:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌐 Admin Portal: http://localhost:3001');
    console.log('🌐 Client Portal: http://localhost:3000');
    console.log('');
    console.log('👤 Администратор:');
    console.log('   Логин: admin-user');
    console.log('   Пароль: admin123');
    console.log('   Роли: admin, approver, user');
    console.log('');
    console.log('👤 Одобряющий:');
    console.log('   Логин: approver-user');
    console.log('   Пароль: approver123');
    console.log('   Роли: approver, user');
    console.log('');
    console.log('👤 Пользователь:');
    console.log('   Логин: test-user');
    console.log('   Пароль: user123');
    console.log('   Роли: user');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

main();
