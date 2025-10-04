const axios = require('axios');

async function setupKeycloakAdmin() {
  try {
    const keycloakUrl = 'http://localhost:8080';
    const adminUsername = 'admin';
    const adminPassword = 'admin';
    
    console.log('🔐 Настройка Keycloak администратора...');
    
    // 1. Получаем токен администратора
    const tokenResponse = await axios.post(`${keycloakUrl}/realms/master/protocol/openid-connect/token`, 
      new URLSearchParams({
        grant_type: 'password',
        client_id: 'admin-cli',
        username: adminUsername,
        password: adminPassword
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const accessToken = tokenResponse.data.access_token;
    console.log('✅ Получен токен администратора');
    
    // 2. Создаем пользователя admin-user
    const userData = {
      username: 'admin-user',
      email: 'admin@secretmanager.local',
      firstName: 'Admin',
      lastName: 'User',
      enabled: true,
      credentials: [{
        type: 'password',
        value: 'admin123',
        temporary: false
      }]
    };
    
    try {
      await axios.post(`${keycloakUrl}/admin/realms/master/users`, userData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Пользователь admin-user создан');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('ℹ️ Пользователь admin-user уже существует');
      } else {
        throw error;
      }
    }
    
    // 3. Находим ID пользователя
    const usersResponse = await axios.get(`${keycloakUrl}/admin/realms/master/users?username=admin-user`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const userId = usersResponse.data[0].id;
    console.log('✅ ID пользователя найден:', userId);
    
    // 4. Назначаем роль admin
    const realmRolesResponse = await axios.get(`${keycloakUrl}/admin/realms/master/roles`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const adminRole = realmRolesResponse.data.find(role => role.name === 'admin');
    if (adminRole) {
      await axios.post(`${keycloakUrl}/admin/realms/master/users/${userId}/role-mappings/realm`, 
        [adminRole], 
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✅ Роль admin назначена пользователю');
    }
    
    console.log('\n🎉 Настройка завершена!');
    console.log('📋 Данные для входа в админку:');
    console.log('   Логин: admin-user');
    console.log('   Пароль: admin123');
    console.log('   URL: http://localhost:3001');
    
  } catch (error) {
    console.error('❌ Ошибка настройки:', error.response?.data || error.message);
  }
}

setupKeycloakAdmin();
