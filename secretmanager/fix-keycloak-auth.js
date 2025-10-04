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

async function deleteExistingClients(token) {
  try {
    const response = await axios.get(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/clients`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    const clients = response.data.filter(c => 
      c.clientId === 'secretmanager-client' || c.clientId === 'secretmanager-admin'
    );
    
    for (const client of clients) {
      console.log(`🗑️ Удаление клиента ${client.clientId}...`);
      await axios.delete(
        `${KEYCLOAK_URL}/admin/realms/${REALM}/clients/${client.id}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
    }
    
    console.log('✅ Существующие клиенты удалены');
  } catch (error) {
    console.log('ℹ️ Клиенты не найдены или уже удалены');
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
  const roles = ['admin', 'approver', 'user'];
  
  for (const roleName of roles) {
    try {
      await axios.post(
        `${KEYCLOAK_URL}/admin/realms/${REALM}/roles`,
        { name: roleName, description: `${roleName} role` },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      console.log(`✅ Роль ${roleName} создана`);
    } catch (error) {
      if (error.response?.status === 409) {
        console.log(`ℹ️ Роль ${roleName} уже существует`);
      } else {
        console.error(`❌ Ошибка создания роли ${roleName}:`, error.response?.data || error.message);
      }
    }
  }
}

async function createUser(token) {
  const userData = {
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
    }]
  };

  try {
    await axios.post(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/users`,
      userData,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    console.log('✅ Пользователь admin-user создан');
    
    // Получаем ID пользователя
    const usersResponse = await axios.get(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/users?username=admin-user`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    const user = usersResponse.data[0];
    if (user) {
      // Назначаем роли
      const roles = ['admin', 'approver', 'user'];
      for (const roleName of roles) {
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
          console.log(`✅ Роль ${roleName} назначена пользователю`);
        } catch (error) {
          console.error(`❌ Ошибка назначения роли ${roleName}:`, error.response?.data || error.message);
        }
      }
    }
    
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('ℹ️ Пользователь admin-user уже существует');
    } else {
      console.error('❌ Ошибка создания пользователя:', error.response?.data || error.message);
    }
  }
}

async function main() {
  try {
    console.log('🔐 Исправление аутентификации Keycloak...\n');
    
    // Ждем запуска Keycloak
    await waitForKeycloak();
    
    console.log('\n1️⃣ Получение токена администратора...');
    const token = await getAdminToken();
    console.log('✅ Токен получен\n');
    
    console.log('2️⃣ Удаление существующих клиентов...');
    await deleteExistingClients(token);
    
    console.log('\n3️⃣ Создание клиента secretmanager-client...');
    await createClient('secretmanager-client', token);
    
    console.log('4️⃣ Создание клиента secretmanager-admin...');
    await createClient('secretmanager-admin', token);
    
    console.log('\n5️⃣ Создание ролей...');
    await createRoles(token);
    
    console.log('\n6️⃣ Создание пользователя...');
    await createUser(token);
    
    console.log('\n🎉 Настройка Keycloak завершена!');
    console.log('\n📋 Информация для входа:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌐 Admin Portal: http://localhost:3001');
    console.log('🌐 Client Portal: http://localhost:3000');
    console.log('👤 Логин: admin-user');
    console.log('🔑 Пароль: admin123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

main();
