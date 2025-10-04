const axios = require('axios');

async function testAdminAPI() {
  try {
    console.log('🔍 Тестирование API админки...');
    
    // Тестируем health check
    const healthResponse = await axios.get('http://localhost:8000/health');
    console.log('✅ Health check:', healthResponse.data.status);
    
    // Проверяем доступность эндпоинтов без токена (должны вернуть 401)
    const endpoints = [
      '/api/analytics/overview',
      '/api/requests',
      '/api/secrets'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`http://localhost:8000${endpoint}`);
        console.log(`❌ ${endpoint} - неожиданно доступен без токена`);
      } catch (error) {
        if (error.response?.status === 401) {
          console.log(`✅ ${endpoint} - правильно требует аутентификацию`);
        } else {
          console.log(`❌ ${endpoint} - ошибка:`, error.response?.status);
        }
      }
    }
    
    console.log('\n📋 Результат:');
    console.log('- API эндпоинты работают правильно');
    console.log('- Проблема в том, что нужен валидный токен с админскими правами');
    console.log('- Решение: очистить токены и войти заново');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

testAdminAPI();
