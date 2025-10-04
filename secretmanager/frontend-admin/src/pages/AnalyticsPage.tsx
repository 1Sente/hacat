import { useEffect, useState } from 'react'
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  TrendingUp, 
  Users, 
  FileText, 
  CheckCircle,
  Activity,
  Download
} from 'lucide-react'
import { api } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

interface AnalyticsData {
  overview: {
    totalRequests: number
    pendingRequests: number
    approvedRequests: number
    rejectedRequests: number
    totalUsers: number
    totalSecrets: number
    approvalRate: string
  }
  requestsByDate: Array<{
    date: string
    count: number
  }>
  requestsByStatus: Array<{
    status: string
    count: number
  }>
  topRequesters: Array<{
    username: string
    requestCount: number
  }>
  approvalStats: Array<{
    action: string
    count: number
  }>
  recentActivity: Array<{
    id: number
    action: string
    actor: string
    details: string
    timestamp: string
    request?: {
      id: number
      resource: string
    }
  }>
}


export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('30d')

  useEffect(() => {
    fetchAnalytics()
  }, [selectedPeriod])

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      const response = await api.analytics.overview()
      setAnalyticsData(response.data.analytics)
    } catch (error: any) {
      console.error('Error fetching analytics:', error)
      toast.error('Ошибка загрузки аналитики')
    } finally {
      setIsLoading(false)
    }
  }

  const exportData = () => {
    if (!analyticsData) return
    
    const dataStr = JSON.stringify(analyticsData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `secret-manager-analytics-${new Date().toISOString().split('T')[0]}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
    
    toast.success('Данные экспортированы')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b'
      case 'approved': return '#10b981'
      case 'rejected': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'REQUEST_CREATED': return '#3b82f6'
      case 'REQUEST_APPROVED': return '#10b981'
      case 'REQUEST_REJECTED': return '#ef4444'
      case 'SECRET_ACCESSED': return '#8b5cf6'
      default: return '#6b7280'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="card text-center py-12">
        <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Нет данных для отображения
        </h3>
        <p className="text-gray-500">
          Данные аналитики пока недоступны
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Аналитика</h1>
          <p className="text-gray-600">
            Статистика использования системы управления секретами
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="input-field w-auto"
          >
            <option value="7d">Последние 7 дней</option>
            <option value="30d">Последние 30 дней</option>
            <option value="90d">Последние 90 дней</option>
            <option value="1y">Последний год</option>
          </select>
          
          <button
            onClick={exportData}
            className="btn-secondary flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Экспорт</span>
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Всего запросов</p>
              <p className="text-2xl font-semibold text-gray-900">
                {analyticsData.overview.totalRequests}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Одобрено</p>
              <p className="text-2xl font-semibold text-gray-900">
                {analyticsData.overview.approvedRequests}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Пользователи</p>
              <p className="text-2xl font-semibold text-gray-900">
                {analyticsData.overview.totalUsers}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-yellow-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Процент одобрения</p>
              <p className="text-2xl font-semibold text-gray-900">
                {analyticsData.overview.approvalRate}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requests by Date */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Запросы по датам
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analyticsData.requestsByDate}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString('ru-RU')}
                  formatter={(value: any) => [value, 'Запросы']}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Requests by Status */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Запросы по статусам
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analyticsData.requestsByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, count }) => `${status}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analyticsData.requestsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Requesters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Топ пользователей по запросам
          </h3>
          <div className="space-y-3">
            {analyticsData.topRequesters.slice(0, 5).map((requester, index) => (
              <div key={requester.username} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {index + 1}
                    </span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {requester.username}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  {requester.requestCount} запросов
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Approval Stats */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Статистика одобрений
          </h3>
          <div className="space-y-3">
            {analyticsData.approvalStats.map((stat) => (
              <div key={stat.action} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {stat.action === 'REQUEST_APPROVED' && 'Одобрено'}
                  {stat.action === 'REQUEST_REJECTED' && 'Отклонено'}
                  {stat.action === 'SECRET_ACCESSED' && 'Доступ к секретам'}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {stat.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Последняя активность
        </h3>
        <div className="space-y-3">
          {analyticsData.recentActivity.slice(0, 10).map((activity) => (
            <div key={activity.id} className="flex items-center space-x-4 py-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getActionColor(activity.action) }}
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    {activity.actor}
                  </span>
                  <span className="text-sm text-gray-600">
                    {activity.action === 'REQUEST_CREATED' && 'создал запрос'}
                    {activity.action === 'REQUEST_APPROVED' && 'одобрил запрос'}
                    {activity.action === 'REQUEST_REJECTED' && 'отклонил запрос'}
                    {activity.action === 'SECRET_ACCESSED' && 'получил доступ к секрету'}
                  </span>
                  {activity.request && (
                    <span className="text-sm text-gray-500">
                      для {activity.request.resource}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(activity.timestamp).toLocaleString('ru-RU')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}