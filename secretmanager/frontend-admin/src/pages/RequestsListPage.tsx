import { useEffect, useState } from 'react'
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle,
  Eye,
  User,
  Calendar,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react'
import { api } from '../services/api'
import { cn } from '../utils/cn'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

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

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'

export default function RequestsListPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      setIsLoading(true)
      const response = await api.requests.list()
      setRequests(response.data.requests)
    } catch (error: any) {
      console.error('Error fetching requests:', error)
      toast.error('Ошибка загрузки запросов')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredRequests = requests.filter(request => {
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter
    const matchesSearch = request.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.requester?.username.toLowerCase().includes(searchTerm.toLowerCase())
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Все запросы</h1>
          <p className="text-gray-600">
            Просмотр и управление всеми запросами на доступ к секретам
          </p>
        </div>
        
        <button
          onClick={fetchRequests}
          className="btn-secondary flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Обновить</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по ресурсу, обоснованию или пользователю..."
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

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-900">{requests.length}</div>
          <div className="text-sm text-gray-500">Всего запросов</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {requests.filter(r => r.status === 'pending').length}
          </div>
          <div className="text-sm text-gray-500">Ожидают</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">
            {requests.filter(r => r.status === 'approved').length}
          </div>
          <div className="text-sm text-gray-500">Одобрены</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-red-600">
            {requests.filter(r => r.status === 'rejected').length}
          </div>
          <div className="text-sm text-gray-500">Отклонены</div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th>ID</th>
                <th>Ресурс</th>
                <th>Запрашивающий</th>
                <th>Статус</th>
                <th>Дата создания</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="font-mono text-sm">#{request.id}</td>
                  <td>
                    <div>
                      <div className="font-medium text-gray-900">{request.resource}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {request.reason}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900">
                          {request.requester?.username}
                        </div>
                        {request.requester?.email && (
                          <div className="text-sm text-gray-500">
                            {request.requester.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={cn(
                      'status-badge',
                      `status-${request.status}`
                    )}>
                      {getStatusIcon(request.status)}
                      <span className="ml-1">{getStatusText(request.status)}</span>
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(request.createdAt)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          // Navigate to request details
                          console.log('View request:', request.id)
                        }}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {request.status === 'approved' && request.secretName && (
                        <span className="text-xs text-green-600 font-medium">
                          Секрет создан
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRequests.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Запросы не найдены
              </h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all'
                  ? 'Попробуйте изменить параметры поиска'
                  : 'Пока нет запросов для отображения'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}