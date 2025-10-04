import { useEffect, useState } from 'react'
import { 
  CheckCircle, 
  XCircle,
  Clock,
  Eye,
  User,
  Calendar,
  AlertTriangle,
  Shield
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

export default function ApprovalsPage() {
  const [pendingRequests, setPendingRequests] = useState<Request[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [secretData, setSecretData] = useState<Record<string, string>>({})
  const [rejectReason, setRejectReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    fetchPendingRequests()
  }, [])

  const fetchPendingRequests = async () => {
    try {
      setIsLoading(true)
      const response = await api.requests.list({ status: 'pending' })
      setPendingRequests(response.data.requests)
    } catch (error: any) {
      console.error('Error fetching pending requests:', error)
      toast.error('Ошибка загрузки запросов')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedRequest) return

    // Validate secret data
    const hasData = Object.values(secretData).some(value => value.trim() !== '')
    if (!hasData) {
      toast.error('Пожалуйста, введите данные секрета')
      return
    }

    try {
      setIsProcessing(true)
      await api.requests.approve(selectedRequest.id, secretData)
      toast.success('Запрос успешно одобрен')
      setSelectedRequest(null)
      setSecretData({})
      fetchPendingRequests()
    } catch (error: any) {
      console.error('Error approving request:', error)
      toast.error(error.response?.data?.message || 'Ошибка одобрения запроса')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedRequest) return

    try {
      setIsProcessing(true)
      await api.requests.reject(selectedRequest.id, rejectReason)
      toast.success('Запрос отклонен')
      setSelectedRequest(null)
      setRejectReason('')
      fetchPendingRequests()
    } catch (error: any) {
      console.error('Error rejecting request:', error)
      toast.error(error.response?.data?.message || 'Ошибка отклонения запроса')
    } finally {
      setIsProcessing(false)
    }
  }

  const addSecretField = () => {
    const key = `field_${Object.keys(secretData).length + 1}`
    setSecretData(prev => ({ ...prev, [key]: '' }))
  }

  const updateSecretField = (key: string, value: string) => {
    setSecretData(prev => ({ ...prev, [key]: value }))
  }

  const removeSecretField = (key: string) => {
    setSecretData(prev => {
      const newData = { ...prev }
      delete newData[key]
      return newData
    })
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
          <h1 className="text-2xl font-bold text-gray-900">Одобрения</h1>
          <p className="text-gray-600">
            Рассмотрение и одобрение запросов на доступ к секретам
          </p>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>{pendingRequests.length} ожидают рассмотрения</span>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-600">{pendingRequests.length}</div>
          <div className="text-sm text-gray-500">Ожидают рассмотрения</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">0</div>
          <div className="text-sm text-gray-500">Одобрены сегодня</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-600">0</div>
          <div className="text-sm text-gray-500">Отклонены сегодня</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Requests List */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Запросы на рассмотрение</h2>
          
          {pendingRequests.length === 0 ? (
            <div className="card text-center py-12">
              <CheckCircle className="mx-auto h-12 w-12 text-green-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Все запросы рассмотрены
              </h3>
              <p className="text-gray-500">
                Нет ожидающих запросов на рассмотрение
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className={cn(
                    'card cursor-pointer transition-all duration-200',
                    selectedRequest?.id === request.id
                      ? 'ring-2 ring-primary-500 bg-primary-50'
                      : 'hover:shadow-md'
                  )}
                  onClick={() => setSelectedRequest(request)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-mono text-sm text-gray-500">#{request.id}</span>
                        <span className="status-badge status-pending">
                          <Clock className="w-3 h-3" />
                          <span className="ml-1">Ожидает</span>
                        </span>
                      </div>
                      
                      <h3 className="font-medium text-gray-900 mb-1">
                        {request.resource}
                      </h3>
                      
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {request.reason}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>{request.requester?.username}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(request.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button className="text-gray-400 hover:text-gray-600">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Request Details and Actions */}
        <div>
          {selectedRequest ? (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  Запрос #{selectedRequest.id}
                </h2>
                <span className="status-badge status-pending">
                  <Clock className="w-4 h-4" />
                  <span className="ml-1">Ожидает</span>
                </span>
              </div>

              {/* Request Details */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ресурс
                  </label>
                  <p className="text-gray-900 font-mono bg-gray-50 p-2 rounded">
                    {selectedRequest.resource}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Обоснование
                  </label>
                  <p className="text-gray-900 bg-gray-50 p-2 rounded">
                    {selectedRequest.reason}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Запрашивающий
                    </label>
                    <p className="text-gray-900">{selectedRequest.requester?.username}</p>
                    <p className="text-sm text-gray-500">{selectedRequest.requester?.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Дата создания
                    </label>
                    <p className="text-gray-900">{formatDate(selectedRequest.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Secret Data Input */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Данные секрета
                  </label>
                  <button
                    onClick={addSecretField}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    + Добавить поле
                  </button>
                </div>

                <div className="space-y-3">
                  {Object.entries(secretData).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Ключ"
                        value={key}
                        onChange={(e) => {
                          const newKey = e.target.value
                          const newData = { ...secretData }
                          delete newData[key]
                          newData[newKey] = value
                          setSecretData(newData)
                        }}
                        className="input-field flex-1"
                      />
                      <input
                        type="text"
                        placeholder="Значение"
                        value={value}
                        onChange={(e) => updateSecretField(key, e.target.value)}
                        className="input-field flex-1"
                      />
                      <button
                        onClick={() => removeSecretField(key)}
                        className="text-red-600 hover:text-red-700 p-2"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {Object.keys(secretData).length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <Shield className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>Нажмите "Добавить поле" для создания секрета</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Reject Reason */}
              <div className="space-y-4 mb-6">
                <label className="block text-sm font-medium text-gray-700">
                  Причина отклонения (если отклоняете)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Укажите причину отклонения запроса..."
                  rows={3}
                  className="input-field"
                />
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-yellow-900">
                      Внимание
                    </h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      После одобрения секрет будет сохранен в OpenBao и станет доступен пользователю.
                      Убедитесь в корректности данных перед сохранением.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setSelectedRequest(null)
                    setSecretData({})
                    setRejectReason('')
                  }}
                  className="btn-secondary"
                  disabled={isProcessing}
                >
                  Отмена
                </button>
                
                <button
                  onClick={handleReject}
                  disabled={isProcessing || !rejectReason.trim()}
                  className="btn-danger"
                >
                  {isProcessing ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>Отклонить</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleApprove}
                  disabled={isProcessing || Object.keys(secretData).length === 0}
                  className="btn-success"
                >
                  {isProcessing ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Одобрить</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="card text-center py-12">
              <Eye className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Выберите запрос
              </h3>
              <p className="text-gray-500">
                Нажмите на запрос из списка слева для просмотра деталей
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}