import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  Eye, 
  EyeOff, 
  Copy, 
  Download,
  ArrowLeft,
  Shield,
  AlertTriangle
} from 'lucide-react'
import { api } from '../services/api'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

interface SecretData {
  name: string
  data: Record<string, any>
  requestId: number
  resource: string
  accessedAt: string
}

export default function SecretViewPage() {
  const { secretName } = useParams<{ secretName: string }>()
  const navigate = useNavigate()
  const [secret, setSecret] = useState<SecretData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showValues, setShowValues] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    if (secretName) {
      fetchSecret()
    }
  }, [secretName])

  const fetchSecret = async () => {
    if (!secretName) return

    try {
      setIsLoading(true)
      setError(null)
      const response = await api.secrets.get(secretName)
      setSecret(response.data.secret)
    } catch (err: any) {
      console.error('Error fetching secret:', err)
      setError(err.response?.data?.message || 'Ошибка загрузки секрета')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleValueVisibility = (key: string) => {
    setShowValues(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} скопирован в буфер обмена`)
    } catch (err) {
      toast.error('Ошибка копирования в буфер обмена')
    }
  }

  const downloadSecret = () => {
    if (!secret) return

    const dataStr = JSON.stringify(secret.data, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `${secret.name}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const maskValue = (value: any) => {
    if (typeof value !== 'string') return value
    if (value.length <= 4) return '•'.repeat(value.length)
    return '•'.repeat(value.length - 4) + value.slice(-4)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            to="/requests"
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Назад к запросам</span>
          </Link>
        </div>

        <div className="card text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Ошибка загрузки секрета
          </h3>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={fetchSecret}
            className="btn-primary"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  if (!secret) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center py-12">
          <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Секрет не найден
          </h3>
          <p className="text-gray-500 mb-6">
            Возможно, секрет был удален или у вас нет прав доступа
          </p>
          <Link to="/requests" className="btn-primary">
            Вернуться к запросам
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/requests"
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад к запросам</span>
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Секрет: {secret.name}</h1>
            <p className="text-gray-600">
              Ресурс: {secret.resource} • Запрос #{secret.requestId}
            </p>
          </div>
          
          <button
            onClick={downloadSecret}
            className="btn-secondary flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Скачать</span>
          </button>
        </div>
      </div>

      {/* Security Warning */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-900">
              Внимание! Конфиденциальная информация
            </h3>
            <p className="text-sm text-red-700 mt-1">
              Данные секрета содержат конфиденциальную информацию. Не передавайте их третьим лицам 
              и не сохраняйте в незащищенных местах. Все действия с секретами логируются.
            </p>
          </div>
        </div>
      </div>

      {/* Secret Data */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-gray-900">Данные секрета</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                const allVisible = Object.values(showValues).every(Boolean)
                const newState = Object.keys(secret.data).reduce((acc, key) => {
                  acc[key] = !allVisible
                  return acc
                }, {} as { [key: string]: boolean })
                setShowValues(newState)
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {Object.values(showValues).every(Boolean) ? 'Скрыть все' : 'Показать все'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(secret.data).map(([key, value]) => (
            <div key={key} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">{key}</label>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleValueVisibility(key)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showValues[key] ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => copyToClipboard(String(value), key)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="bg-gray-50 rounded-md p-3 font-mono text-sm">
                <span className={showValues[key] ? 'text-gray-900' : 'text-gray-500'}>
                  {showValues[key] ? String(value) : maskValue(value)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Metadata */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Метаданные</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Дата доступа:</span>
              <span className="ml-2 text-gray-900">
                {new Date(secret.accessedAt).toLocaleString('ru-RU')}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Имя секрета:</span>
              <span className="ml-2 text-gray-900 font-mono">{secret.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-end">
        <Link to="/requests" className="btn-secondary">
          Вернуться к запросам
        </Link>
      </div>
    </div>
  )
}
