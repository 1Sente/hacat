import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

/**
 * Компонент для автоматической очистки токенов при обнаружении проблем с аутентификацией
 */
export default function AutoTokenCleanup() {
  const { isAuthenticated, handleAuthError, clearTokens } = useAuthStore()

  useEffect(() => {
    // Проверяем состояние аутентификации при загрузке компонента
    if (isAuthenticated) {
      // Устанавливаем периодическую проверку токена (каждые 5 минут)
      const checkTokenInterval = setInterval(async () => {
        try {
          const { token } = useAuthStore.getState()
          if (!token) {
            console.log('Токен отсутствует, очищаем состояние...')
            clearTokens()
            toast.error('Сессия истекла. Пожалуйста, войдите в систему заново.', {
              duration: 5000,
            })
            return
          }

          const response = await fetch('/api/auth/me', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
          })
          
          if (!response.ok && response.status === 401) {
            console.log('Токен истек, запускаем автоматическую очистку...')
            clearTokens()
            toast.error('Сессия истекла. Пожалуйста, войдите в систему заново.', {
              duration: 5000,
            })
          }
        } catch (error) {
          // Игнорируем ошибки сети, так как это может быть временная проблема
          console.log('Ошибка проверки токена (возможно, сеть):', error)
        }
      }, 5 * 60 * 1000) // 5 минут

      return () => clearInterval(checkTokenInterval)
    }
  }, [isAuthenticated, clearTokens])

  // Этот компонент не рендерит ничего видимого
  return null
}
