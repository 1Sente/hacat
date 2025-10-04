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
    redirectUris: [
      `http://localhost:3000/*`,
      `http://localhost:3001/*`
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
    console.log('🔐 Финальная настройка Keycloak...\n');
    
    // Ждем запуска Keycloak
    await waitForKeycloak();
    
    console.log('\n1️⃣ Получение токена администратора...');
    const token = await getAdminToken();
    console.log('✅ Токен получен\n');
    
    console.log('2️⃣ Создание клиентов...');
    await createClient('secretmanager-client', token);
    await createClient('secretmanager-admin', token);
    
    console.log('\n3️⃣ Создание пользователя...');
    await createUser(token);
    
    console.log('\n🎉 Настройка Keycloak завершена!');
    console.log('\n📋 Информация для входа:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌐 Admin Portal: http://localhost:3001');
    console.log('🌐 Client Portal: http://localhost:3000');
    console.log('🔑 Keycloak Admin: http://localhost:8080/admin');
    console.log('👤 Логин: admin-user');
    console.log('🔑 Пароль: admin123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

main();
