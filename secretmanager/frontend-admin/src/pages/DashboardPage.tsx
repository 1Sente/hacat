import { useEffect } from 'react'
import { Shield, Users, FileText, CheckCircle, Clock, TrendingUp, Activity } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useAnalyticsStore } from '../store/analyticsStore'
import { useRequestStore } from '../store/requestStore'
import LoadingSpinner from '../components/LoadingSpinner'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { analyticsData, isLoading: analyticsLoading, fetchAnalytics } = useAnalyticsStore()
  const { requests, isLoading: requestsLoading, fetchRequests } = useRequestStore()

  useEffect(() => {
    fetchAnalytics()
    fetchRequests()
  }, [fetchAnalytics, fetchRequests])

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const approvedRequests = requests.filter(r => r.status === 'approved')

  if (analyticsLoading || requestsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Добро пожаловать, {user?.firstName || user?.username}!
        </h1>
        <p className="text-red-100">
          Административная панель для управления запросами и секретами
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                {analyticsData?.overview.totalRequests || requests.length}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Ожидают</p>
              <p className="text-2xl font-semibold text-gray-900">
                {analyticsData?.overview.pendingRequests || pendingRequests.length}
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
              <p className="text-sm font-medium text-gray-500">Одобрены</p>
              <p className="text-2xl font-semibold text-gray-900">
                {analyticsData?.overview.approvedRequests || approvedRequests.length}
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
                {analyticsData?.overview.totalUsers || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {analyticsData?.recentActivity && analyticsData.recentActivity.length > 0 && (
        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <Activity className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-medium text-gray-900">Последняя активность</h2>
          </div>
          <div className="space-y-3">
            {analyticsData.recentActivity.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3 py-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{activity.actor}</span>
                    {' '}
                    {activity.action === 'REQUEST_CREATED' && 'создал запрос'}
                    {activity.action === 'REQUEST_APPROVED' && 'одобрил запрос'}
                    {activity.action === 'REQUEST_REJECTED' && 'отклонил запрос'}
                    {activity.action === 'SECRET_ACCESSED' && 'получил доступ к секрету'}
                    {activity.request && (
                      <span className="text-gray-500">
                        {' '}для {activity.request.resource}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(activity.timestamp).toLocaleString('ru-RU')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Info */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="w-6 h-6 text-red-600" />
          <h2 className="text-lg font-medium text-gray-900">Административные функции</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium text-gray-900">Управление запросами</h3>
            </div>
            <p className="text-sm text-gray-600">Просмотр, одобрение и отклонение запросов на доступ к секретам</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h3 className="font-medium text-gray-900">Аналитика и аудит</h3>
            </div>
            <p className="text-sm text-gray-600">Просмотр статистики использования и аудит доступа к секретам</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="w-5 h-5 text-purple-600" />
              <h3 className="font-medium text-gray-900">Управление секретами</h3>
            </div>
            <p className="text-sm text-gray-600">Создание, редактирование, ротация и удаление секретов в системе</p>
          </div>
        </div>
      </div>

      {/* Pending Requests Alert */}
      {pendingRequests.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-yellow-600" />
            <div>
              <h3 className="text-sm font-medium text-yellow-900">
                Ожидают рассмотрения
              </h3>
              <p className="text-sm text-yellow-700">
                У вас есть {pendingRequests.length} запрос(ов) на рассмотрение. 
                Перейдите в раздел "Одобрения" для их обработки.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
