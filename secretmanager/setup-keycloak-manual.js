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
    console.log('🔐 Ручная настройка Keycloak...\n');
    
    // Ждем запуска Keycloak
    await waitForKeycloak();
    
    console.log('\n1️⃣ Получение токена администратора...');
    const token = await getAdminToken();
    console.log('✅ Токен получен\n');
    
    console.log('2️⃣ Создание пользователя...');
    await createUser(token);
    
    console.log('\n🎉 Настройка Keycloak завершена!');
    console.log('\n📋 Информация для входа:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌐 Admin Portal: http://localhost:3001');
    console.log('🌐 Client Portal: http://localhost:3000');
    console.log('👤 Логин: admin-user');
    console.log('🔑 Пароль: admin123');
    console.log('');
    console.log('⚠️  ВАЖНО: Клиенты нужно создать вручную!');
    console.log('1. Откройте http://localhost:8080/admin');
    console.log('2. Войдите как admin/admin');
    console.log('3. Выберите realm "master"');
    console.log('4. Перейдите в Clients → Create');
    console.log('5. Создайте клиента "secretmanager-client"');
    console.log('6. Создайте клиента "secretmanager-admin"');
    console.log('7. Настройте Redirect URIs: http://localhost:3000/*, http://localhost:3001/*');
    console.log('8. Включите Standard Flow и Direct Access Grants');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

main();
