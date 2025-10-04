import { create } from 'zustand'
import { api } from '../services/api'

interface OverviewStats {
  totalRequests: number
  pendingRequests: number
  approvedRequests: number
  rejectedRequests: number
  totalUsers: number
  totalSecrets: number
  approvalRate: string
}

interface ChartData {
  date: string
  count: number
}

interface StatusData {
  status: string
  count: number
}

interface UserStats {
  username: string
  requestCount: number
}

interface ActivityStats {
  action: string
  count: number
}

interface RecentActivity {
  id: number
  action: string
  actor: string
  details: string
  timestamp: string
  request?: {
    id: number
    resource: string
  }
}

interface AnalyticsData {
  overview: OverviewStats
  requestsByDate: ChartData[]
  requestsByStatus: StatusData[]
  topRequesters: UserStats[]
  approvalStats: ActivityStats[]
  recentActivity: RecentActivity[]
}

interface AnalyticsState {
  analyticsData: AnalyticsData | null
  isLoading: boolean
  error: string | null
  selectedPeriod: string
}

interface AnalyticsActions {
  fetchAnalytics: (period?: string) => Promise<void>
  setSelectedPeriod: (period: string) => void
  clearError: () => void
}

type AnalyticsStore = AnalyticsState & AnalyticsActions

export const useAnalyticsStore = create<AnalyticsStore>((set, get) => ({
  // State
  analyticsData: null,
  isLoading: false,
  error: null,
  selectedPeriod: '30d',

  // Actions
  fetchAnalytics: async (period = '30d') => {
    set({ isLoading: true, error: null, selectedPeriod: period })
    try {
      const response = await api.analytics.overview()
      set({ 
        analyticsData: response.data.analytics,
        isLoading: false 
      })
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Ошибка загрузки аналитики',
        isLoading: false 
      })
    }
  },

  setSelectedPeriod: (period: string) => {
    set({ selectedPeriod: period })
    get().fetchAnalytics(period)
  },

  clearError: () => set({ error: null }),
}))
