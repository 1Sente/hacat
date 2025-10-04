import { create } from 'zustand'
import { apiClient } from '../services/api'

interface Request {
  id: number
  resource: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  secretName?: string
  createdAt: string
  updatedAt: string
  requester?: {
    username: string
    email?: string
  }
  approver?: {
    username: string
    email?: string
  }
}

interface RequestState {
  requests: Request[]
  isLoading: boolean
  error: string | null
  currentRequest: Request | null
}

interface RequestActions {
  fetchRequests: () => Promise<void>
  createRequest: (resource: string, reason: string) => Promise<Request | null>
  fetchRequest: (id: number) => Promise<Request | null>
  setCurrentRequest: (request: Request | null) => void
  clearError: () => void
}

type RequestStore = RequestState & RequestActions

export const useRequestStore = create<RequestStore>((set) => ({
  // State
  requests: [],
  isLoading: false,
  error: null,
  currentRequest: null,

  // Actions
  fetchRequests: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.get('/requests')
      set({ 
        requests: response.data.requests,
        isLoading: false 
      })
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Ошибка загрузки запросов',
        isLoading: false 
      })
    }
  },

  createRequest: async (resource: string, reason: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.post('/requests', {
        resource,
        reason
      })
      
      const newRequest = response.data.request
      set(state => ({
        requests: [newRequest, ...state.requests],
        isLoading: false
      }))
      
      return newRequest
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Ошибка создания запроса',
        isLoading: false 
      })
      return null
    }
  },

  fetchRequest: async (id: number) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.get(`/requests/${id}`)
      const request = response.data.request
      set({ 
        currentRequest: request,
        isLoading: false 
      })
      return request
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Ошибка загрузки запроса',
        isLoading: false 
      })
      return null
    }
  },

  setCurrentRequest: (request: Request | null) => 
    set({ currentRequest: request }),

  clearError: () => set({ error: null }),
}))
