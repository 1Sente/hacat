import { create } from 'zustand'
import { api } from '../services/api'

interface Secret {
  name: string
  requestId: number
  resource: string
  requester: string
  approver?: string
  approvedAt: string
  createdAt: string
}

interface SecretState {
  secrets: Secret[]
  isLoading: boolean
  error: string | null
  currentSecret: any | null
}

interface SecretActions {
  fetchSecrets: () => Promise<void>
  createSecret: (name: string, data: Record<string, any>, description?: string) => Promise<boolean>
  updateSecret: (name: string, data: Record<string, any>, description?: string) => Promise<boolean>
  deleteSecret: (name: string) => Promise<boolean>
  rotateSecret: (name: string, newSecretData: Record<string, any>) => Promise<boolean>
  getSecret: (name: string) => Promise<any | null>
  setCurrentSecret: (secret: any | null) => void
  clearError: () => void
}

type SecretStore = SecretState & SecretActions

export const useSecretStore = create<SecretStore>((set) => ({
  // State
  secrets: [],
  isLoading: false,
  error: null,
  currentSecret: null,

  // Actions
  fetchSecrets: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.secrets.list()
      set({ 
        secrets: response.data.secrets,
        isLoading: false 
      })
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Ошибка загрузки секретов',
        isLoading: false 
      })
    }
  },

  createSecret: async (name: string, data: Record<string, any>, description?: string) => {
    set({ isLoading: true, error: null })
    try {
      await api.secrets.create(name, data, description)
      
      // Refresh secrets list
      set(state => ({ isLoading: false }))
      const { fetchSecrets } = useSecretStore.getState()
      await fetchSecrets()
      
      return true
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Ошибка создания секрета',
        isLoading: false 
      })
      return false
    }
  },

  updateSecret: async (name: string, data: Record<string, any>, description?: string) => {
    set({ isLoading: true, error: null })
    try {
      await api.secrets.update(name, data, description)
      
      // Refresh secrets list
      set(state => ({ isLoading: false }))
      const { fetchSecrets } = useSecretStore.getState()
      await fetchSecrets()
      
      return true
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Ошибка обновления секрета',
        isLoading: false 
      })
      return false
    }
  },

  deleteSecret: async (name: string) => {
    set({ isLoading: true, error: null })
    try {
      await api.secrets.delete(name)
      
      // Update secrets list
      set(state => ({
        secrets: state.secrets.filter(secret => secret.name !== name),
        isLoading: false
      }))
      
      return true
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Ошибка удаления секрета',
        isLoading: false 
      })
      return false
    }
  },

  rotateSecret: async (name: string, newSecretData: Record<string, any>) => {
    set({ isLoading: true, error: null })
    try {
      await api.secrets.rotate(name, newSecretData)
      set({ isLoading: false })
      return true
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Ошибка ротации секрета',
        isLoading: false 
      })
      return false
    }
  },

  getSecret: async (name: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.secrets.get(name)
      const secret = response.data.secret
      set({ 
        currentSecret: secret,
        isLoading: false 
      })
      return secret
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Ошибка получения секрета',
        isLoading: false 
      })
      return null
    }
  },

  setCurrentSecret: (secret: any | null) => 
    set({ currentSecret: secret }),

  clearError: () => set({ error: null }),
}))
