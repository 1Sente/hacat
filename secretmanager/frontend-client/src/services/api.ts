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

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const { token } = useAuthStore.getState()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
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
