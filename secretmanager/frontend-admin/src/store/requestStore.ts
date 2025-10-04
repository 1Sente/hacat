import { create } from 'zustand'
import { api } from '../services/api'

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
  fetchRequests: (params?: { status?: string; limit?: number; offset?: number }) => Promise<void>
  approveRequest: (id: number, secretData: Record<string, any>) => Promise<boolean>
  rejectRequest: (id: number, reason?: string) => Promise<boolean>
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
  fetchRequests: async (params = {}) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.requests.list(params)
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

  approveRequest: async (id: number, secretData: Record<string, any>) => {
    set({ isLoading: true, error: null })
    try {
      await api.requests.approve(id, secretData)
      
      // Update request in store
      set(state => ({
        requests: state.requests.map(request => 
          request.id === id 
            ? { ...request, status: 'approved' as const, updatedAt: new Date().toISOString() }
            : request
        ),
        isLoading: false
      }))
      
      return true
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Ошибка одобрения запроса',
        isLoading: false 
      })
      return false
    }
  },

  rejectRequest: async (id: number, reason?: string) => {
    set({ isLoading: true, error: null })
    try {
      await api.requests.reject(id, reason)
      
      // Update request in store
      set(state => ({
        requests: state.requests.map(request => 
          request.id === id 
            ? { ...request, status: 'rejected' as const, updatedAt: new Date().toISOString() }
            : request
        ),
        isLoading: false
      }))
      
      return true
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Ошибка отклонения запроса',
        isLoading: false 
      })
      return false
    }
  },

  fetchRequest: async (id: number) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.requests.get(id)
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
