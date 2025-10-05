import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export function setAuthToken(token?: string | null) {
  if (token) {
    apiClient.defaults.headers.Authorization = `Bearer ${token}`
  } else {
    delete (apiClient.defaults.headers as any).Authorization
  }
}

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const { token, refreshToken, keycloak } = useAuthStore.getState()
    let bearer = token
    try {
      if (!bearer && keycloak) {
        await keycloak.updateToken(0)
        bearer = keycloak.token || null
        if (!bearer) {
          await refreshToken()
          bearer = useAuthStore.getState().token
        }
      }
    } catch (_) {
      // ignore
    }
    if (bearer) {
      config.headers.Authorization = `Bearer ${bearer}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const { refreshToken } = useAuthStore.getState()
        await refreshToken()
        
        // Retry the original request with new token
        const { token } = useAuthStore.getState()
        if (token) {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return apiClient(originalRequest)
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
        const { handleAuthError } = useAuthStore.getState()
        handleAuthError(refreshError)
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// API endpoints
export const api = {
  // Auth endpoints
  auth: {
    me: () => apiClient.get('/auth/me'),
    verify: () => apiClient.post('/auth/verify'),
  },

  // Request endpoints
  requests: {
    list: (params?: { status?: string; limit?: number; offset?: number }) => 
      apiClient.get('/requests', { params }),
    get: (id: number) => apiClient.get(`/requests/${id}`),
    create: (data: { resource: string; reason: string }) => 
      apiClient.post('/requests', data),
    approve: (id: number, secretData: Record<string, any>) => 
      apiClient.post(`/requests/${id}/approve`, { secretData }),
    reject: (id: number, reason?: string) => 
      apiClient.post(`/requests/${id}/reject`, { reason }),
  },

  // Secret endpoints
  secrets: {
    list: () => apiClient.get('/secrets'),
    get: (name: string) => apiClient.get(`/secrets/${name}`),
    create: (name: string, data: Record<string, any>, description?: string) => 
      apiClient.post('/secrets', { name, data, description }),
    update: (name: string, data: Record<string, any>, description?: string) => 
      apiClient.put(`/secrets/${name}`, { data, description }),
    delete: (name: string) => apiClient.delete(`/secrets/${name}`),
    rotate: (name: string, newSecretData: Record<string, any>) => 
      apiClient.post(`/secrets/${name}/rotate`, { newSecretData }),
  },

  // Analytics endpoints
  analytics: {
    overview: () => apiClient.get('/analytics/overview'),
    requests: (params?: { period?: string; groupBy?: string }) => 
      apiClient.get('/analytics/requests', { params }),
    users: () => apiClient.get('/analytics/users'),
    audit: (params?: { limit?: number }) => 
      apiClient.get('/analytics/audit', { params }),
  },
}

export default api
