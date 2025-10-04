const axios = require('axios');

async function testKeycloakAuth() {
  try {
    console.log('🔐 Тестирование аутентификации Keycloak...\n');
    
    // 1. Проверяем доступность Keycloak
    console.log('1️⃣ Проверка доступности Keycloak...');
    const keycloakResponse = await axios.get('http://localhost:8080/');
    console.log('✅ Keycloak доступен');
    
    // 2. Получаем токен администратора
    console.log('\n2️⃣ Получение токена администратора...');
    const tokenResponse = await axios.post('http://localhost:8080/realms/master/protocol/openid-connect/token', 
      new URLSearchParams({
        grant_type: 'password',
        client_id: 'admin-cli',
        username: 'admin',
        password: 'admin'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const adminToken = tokenResponse.data.access_token;
    console.log('✅ Токен администратора получен');
    
    // 3. Получаем токен пользователя
    console.log('\n3️⃣ Получение токена пользователя...');
    const userTokenResponse = await axios.post('http://localhost:8080/realms/master/protocol/openid-connect/token', 
      new URLSearchParams({
        grant_type: 'password',
        client_id: 'secretmanager-client',
        username: 'admin-user',
        password: 'admin123'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const userToken = userTokenResponse.data.access_token;
    console.log('✅ Токен пользователя получен');
    
    // 4. Тестируем backend API
    console.log('\n4️⃣ Тестирование backend API...');
    const apiResponse = await axios.get('http://localhost:8000/health');
    console.log('✅ Backend API доступен');
    console.log('📊 Статус:', apiResponse.data.status);
    
    // 5. Тестируем аутентификацию с токеном
    console.log('\n5️⃣ Тестирование аутентификации с токеном...');
    try {
      const authResponse = await axios.get('http://localhost:8000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      console.log('✅ Аутентификация работает');
      console.log('👤 Пользователь:', authResponse.data.user.username);
    } catch (error) {
      console.log('❌ Ошибка аутентификации:', error.response?.data || error.message);
    }
    
    console.log('\n🎉 Тестирование завершено!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
  }
}

testKeycloakAuth();
