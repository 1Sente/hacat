import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import Keycloak from 'keycloak-js'
import toast from 'react-hot-toast'
import { KeycloakUserInfo, KeycloakTokenParsed } from '../types/keycloak'
import { setAuthToken } from '../services/api'

interface User {
  id: string
  username: string
  email?: string
  firstName?: string
  lastName?: string
  role: string
  roles: string[]
}

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  token: string | null
  keycloak: Keycloak | null
}

interface AuthActions {
  setAuthenticated: (authenticated: boolean) => void
  setLoading: (loading: boolean) => void
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  login: () => Promise<void>
  logout: () => Promise<void>
  initializeAuth: () => Promise<void>
  refreshToken: () => Promise<void>
  clearTokens: () => void
  handleAuthError: (error: any) => void
}

type AuthStore = AuthState & AuthActions

const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'master',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'secretmanager-client',
}

const keycloak = new Keycloak(keycloakConfig)
;(window as any).kc = keycloak

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      isAuthenticated: false,
      isLoading: true,
      user: null,
      token: null,
      keycloak: null,

      // Actions
      setAuthenticated: (authenticated: boolean) => 
        set({ isAuthenticated: authenticated }),
      
      setLoading: (loading: boolean) => 
        set({ isLoading: loading }),
      
      setUser: (user: User | null) => 
        set({ user }),
      
      setToken: (token: string | null) => 
        set({ token }),
      
      initializeAuth: async () => {
        try {
          set({ isLoading: true })
          
          // Принудительная очистка токенов при инициализации, если есть проблемы
          const urlParams = new URLSearchParams(window.location.search)
          if (urlParams.get('clearTokens') === 'true' || urlParams.get('error')) {
            console.log('Принудительная очистка токенов при инициализации')
            get().clearTokens()
            window.history.replaceState({}, document.title, window.location.pathname)
          }
          
          // Дополнительная проверка: если есть старые токены, очищаем их
          const { isAuthenticated, token } = get()
          if (isAuthenticated && token) {
            try {
              const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api')
              const response = await fetch(`${apiBase}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
              })
              if (!response.ok && response.status === 401) {
                console.log('Обнаружен истекший токен при инициализации, очищаем...')
                get().clearTokens()
              }
            } catch (error) {
              console.log('Ошибка проверки токена при инициализации, очищаем...')
              get().clearTokens()
            }
          }
          
          const authenticated = await keycloak.init({
            onLoad: 'login-required',
            silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
            checkLoginIframe: false,
            pkceMethod: 'S256',
          })

          console.log('[Auth] keycloak.init authenticated =', authenticated)
          if (authenticated) {
            const userInfo = await keycloak.loadUserInfo() as KeycloakUserInfo
            const tokenParsed = keycloak.tokenParsed as KeycloakTokenParsed
            const roles = tokenParsed?.realm_access?.roles || []
            
            const user: User = {
              id: userInfo.sub,
              username: userInfo.preferred_username,
              email: userInfo.email,
              firstName: userInfo.given_name,
              lastName: userInfo.family_name,
              role: determineUserRole(roles),
              roles,
            }

            console.log('[Auth] token acquired', !!keycloak.token)
            set({
              isAuthenticated: true,
              user,
              token: keycloak.token || null,
              keycloak,
              isLoading: false,
            })
            setAuthToken(keycloak.token || null)

            // Set up token refresh
            keycloak.onTokenExpired = () => {
              keycloak.updateToken(30).then((refreshed) => {
                if (refreshed) {
                  set({ token: keycloak.token })
                  setAuthToken(keycloak.token || null)
                  console.log('[Auth] token refreshed')
                } else {
                  const tokenParsed = keycloak.tokenParsed as KeycloakTokenParsed
                  console.warn('Token not refreshed, valid for', (tokenParsed?.exp || 0) - Math.round(new Date().getTime() / 1000), 'seconds')
                  // Если токен не обновился, обрабатываем как ошибку аутентификации
                  get().handleAuthError({ message: 'Token refresh failed' })
                }
              }).catch((error) => {
                console.error('Failed to refresh token:', error)
                get().handleAuthError(error)
              })
            }
          } else {
            set({
              isAuthenticated: false,
              user: null,
              token: null,
              keycloak,
              isLoading: false,
            })
            await keycloak.login({
              redirectUri: window.location.origin + '/dashboard'
            })
          }
        } catch (error) {
          console.error('Failed to initialize auth:', error)
          await keycloak.login({ redirectUri: window.location.origin + '/dashboard' })
        }
      },

      login: async () => {
        try {
          set({ isLoading: true })
          await keycloak.login({
            redirectUri: window.location.origin + '/dashboard'
          })
        } catch (error) {
          console.error('Login failed:', error)
          toast.error('Ошибка входа в систему')
          set({ isLoading: false })
        }
      },

      logout: async () => {
        try {
          set({ isLoading: true })
          await keycloak.logout({
            redirectUri: window.location.origin
          })
          
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false,
          })
        } catch (error) {
          console.error('Logout failed:', error)
          toast.error('Ошибка выхода из системы')
          set({ isLoading: false })
        }
      },

      refreshToken: async () => {
        try {
          if (keycloak.token) {
            const refreshed = await keycloak.updateToken(30)
            if (refreshed) {
              set({ token: keycloak.token })
            }
          }
        } catch (error) {
          console.error('Token refresh failed:', error)
          get().handleAuthError(error)
        }
      },

      clearTokens: () => {
        try {
          // Очищаем localStorage
          localStorage.clear()
          
          // Очищаем sessionStorage
          sessionStorage.clear()
          
          // Очищаем все cookies
          document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
          })
          
          // Сбрасываем состояние
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false,
          })
          
          console.log('Токены автоматически очищены')
          
          // Показываем уведомление пользователю
          toast.success('Токены очищены. Пожалуйста, войдите в систему заново.', {
            duration: 3000,
          })
        } catch (error) {
          console.error('Ошибка при очистке токенов:', error)
        }
      },

      handleAuthError: (error: any) => {
        console.error('Ошибка аутентификации:', error)
        
        // Проверяем, является ли ошибка связанной с истекшим токеном
        const isTokenExpired = error?.response?.status === 401 || 
                              error?.message?.includes('invalid_token') ||
                              error?.message?.includes('expired') ||
                              error?.message?.includes('401')
        
        if (isTokenExpired) {
          console.log('Обнаружен истекший токен, выполняем автоматическую очистку...')
          get().clearTokens()
          
          // Показываем уведомление пользователю
          toast.error('Сессия истекла. Пожалуйста, войдите в систему заново.', {
            duration: 5000,
          })
          
          // Перенаправляем на страницу входа через небольшую задержку
          setTimeout(() => {
            get().login()
          }, 2000)
        } else {
          // Для других ошибок просто выходим
          get().logout()
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
      }),
    }
  )
)

function determineUserRole(roles: string[]): string {
  if (roles.includes('admin') || roles.includes('realm-admin')) {
    return 'admin'
  } else if (roles.includes('approver')) {
    return 'approver'
  } else {
    return 'user'
  }
}
