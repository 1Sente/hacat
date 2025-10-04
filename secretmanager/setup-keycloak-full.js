const axios = require('axios');

async function setupKeycloak() {
  try {
    const keycloakUrl = 'http://localhost:8080';
    const adminUsername = 'admin';
    const adminPassword = 'admin';
    const realm = 'master';
    
    console.log('🔐 Настройка Keycloak...\n');
    
    // 1. Получаем токен администратора
    console.log('1️⃣ Получение токена администратора...');
    const tokenResponse = await axios.post(
      `${keycloakUrl}/realms/master/protocol/openid-connect/token`, 
      new URLSearchParams({
        grant_type: 'password',
        client_id: 'admin-cli',
        username: adminUsername,
        password: adminPassword
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    
    const accessToken = tokenResponse.data.access_token;
    console.log('✅ Токен получен\n');
    
    // 2. Создаем клиент secretmanager-client
    console.log('2️⃣ Создание клиента secretmanager-client...');
    try {
      await axios.post(`${keycloakUrl}/admin/realms/${realm}/clients`, {
        clientId: 'secretmanager-client',
        enabled: true,
        publicClient: true,
        directAccessGrantsEnabled: true,
        standardFlowEnabled: true,
        implicitFlowEnabled: false,
        redirectUris: ['http://localhost:3000/*'],
        webOrigins: ['http://localhost:3000'],
        attributes: {
          'pkce.code.challenge.method': 'S256'
        }
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Клиент secretmanager-client создан');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('ℹ️  Клиент secretmanager-client уже существует');
      } else {
        throw error;
      }
    }
    
    // 3. Создаем клиент secretmanager-admin
    console.log('3️⃣ Создание клиента secretmanager-admin...');
    try {
      await axios.post(`${keycloakUrl}/admin/realms/${realm}/clients`, {
        clientId: 'secretmanager-admin',
        enabled: true,
        publicClient: true,
        directAccessGrantsEnabled: true,
        standardFlowEnabled: true,
        implicitFlowEnabled: false,
        redirectUris: ['http://localhost:3001/*'],
        webOrigins: ['http://localhost:3001'],
        attributes: {
          'pkce.code.challenge.method': 'S256'
        }
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Клиент secretmanager-admin создан');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('ℹ️  Клиент secretmanager-admin уже существует');
      } else {
        throw error;
      }
    }
    
    // 4. Создаем роли
    console.log('\n4️⃣ Создание ролей...');
    const roles = ['admin', 'approver', 'user'];
    
    for (const roleName of roles) {
      try {
        await axios.post(`${keycloakUrl}/admin/realms/${realm}/roles`, {
          name: roleName,
          description: `${roleName} role for Secret Manager`
        }, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        console.log(`✅ Роль ${roleName} создана`);
      } catch (error) {
        if (error.response?.status === 409) {
          console.log(`ℹ️  Роль ${roleName} уже существует`);
        } else {
          throw error;
        }
      }
    }
    
    // 5. Создаем пользователя admin-user
    console.log('\n5️⃣ Создание пользователя admin-user...');
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
      await axios.post(`${keycloakUrl}/admin/realms/${realm}/users`, userData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Пользователь admin-user создан');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('ℹ️  Пользователь admin-user уже существует');
      } else {
        throw error;
      }
    }
    
    // 6. Находим ID пользователя и назначаем роли
    console.log('\n6️⃣ Назначение ролей пользователю...');
    const usersResponse = await axios.get(`${keycloakUrl}/admin/realms/${realm}/users?username=admin-user`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (usersResponse.data.length > 0) {
      const userId = usersResponse.data[0].id;
      
      // Получаем все роли
      const realmRolesResponse = await axios.get(`${keycloakUrl}/admin/realms/${realm}/roles`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      const rolesToAssign = realmRolesResponse.data.filter(role => 
        ['admin', 'approver', 'user'].includes(role.name)
      );
      
      if (rolesToAssign.length > 0) {
        await axios.post(
          `${keycloakUrl}/admin/realms/${realm}/users/${userId}/role-mappings/realm`, 
          rolesToAssign, 
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log('✅ Роли назначены пользователю');
      }
    }
    
    console.log('\n🎉 Настройка Keycloak завершена!');
    console.log('\n📋 Информация для входа:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌐 Admin Portal: http://localhost:3001');
    console.log('👤 Логин: admin-user');
    console.log('🔑 Пароль: admin123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🌐 Client Portal: http://localhost:3000');
    console.log('👤 Используйте того же пользователя или создайте нового в Keycloak');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('\n❌ Ошибка настройки:', error.response?.data || error.message);
    console.error('\n💡 Убедитесь, что:');
    console.error('   1. Keycloak запущен (docker compose ps)');
    console.error('   2. Keycloak доступен на http://localhost:8080');
    console.error('   3. Подождите 1-2 минуты после запуска Keycloak\n');
  }
}

setupKeycloak();

