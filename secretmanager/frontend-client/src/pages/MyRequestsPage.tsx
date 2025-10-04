import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye,
  ArrowLeft,
  Filter,
  Search
} from 'lucide-react'
import { useRequestStore } from '../store/requestStore'
import LoadingSpinner from '../components/LoadingSpinner'
import { cn } from '../utils/cn'

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'

export default function MyRequestsPage() {
  const { requests, isLoading, fetchRequests } = useRequestStore()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const filteredRequests = requests.filter(request => {
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter
    const matchesSearch = request.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.reason.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Ожидает'
      case 'approved':
        return 'Одобрен'
      case 'rejected':
        return 'Отклонен'
      default:
        return status
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/dashboard"
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад к дашборду</span>
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Мои запросы</h1>
            <p className="text-gray-600">
              Просмотр и отслеживание ваших запросов на доступ к секретам
            </p>
          </div>
          
          <Link to="/request" className="btn-primary">
            Создать новый запрос
          </Link>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по ресурсу или обоснованию..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="input-field w-auto"
            >
              <option value="all">Все статусы</option>
              <option value="pending">Ожидают</option>
              <option value="approved">Одобрены</option>
              <option value="rejected">Отклонены</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length > 0 ? (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div key={request.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      {request.resource}
                    </h3>
                    <span className={cn(
                      'status-badge',
                      `status-${request.status}`
                    )}>
                      {getStatusIcon(request.status)}
                      <span className="ml-1">{getStatusText(request.status)}</span>
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-3">{request.reason}</p>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Создан: {formatDate(request.createdAt)}</span>
                    {request.updatedAt !== request.createdAt && (
                      <span>Обновлен: {formatDate(request.updatedAt)}</span>
                    )}
                    {request.approver && (
                      <span>Рассмотрел: {request.approver.username}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {request.status === 'approved' && request.secretName && (
                    <Link
                      to={`/secret/${request.secretName}`}
                      className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Просмотреть секрет</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          {searchTerm || statusFilter !== 'all' ? (
            <>
              <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Запросы не найдены
              </h3>
              <p className="text-gray-500 mb-6">
                Попробуйте изменить параметры поиска или фильтрации
              </p>
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                }}
                className="btn-secondary"
              >
                Сбросить фильтры
              </button>
            </>
          ) : (
            <>
              <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                У вас пока нет запросов
              </h3>
              <p className="text-gray-500 mb-6">
                Создайте ваш первый запрос на доступ к секрету
              </p>
              <Link to="/request" className="btn-primary">
                Создать запрос
              </Link>
            </>
          )}
        </div>
      )}

      {/* Statistics */}
      {requests.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card text-center">
            <div className="text-2xl font-bold text-gray-900">{requests.length}</div>
            <div className="text-sm text-gray-500">Всего запросов</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-600">
              {requests.filter(r => r.status === 'approved').length}
            </div>
            <div className="text-sm text-gray-500">Одобрено</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {requests.filter(r => r.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-500">Ожидают</div>
          </div>
        </div>
      )}
    </div>
  )
}
