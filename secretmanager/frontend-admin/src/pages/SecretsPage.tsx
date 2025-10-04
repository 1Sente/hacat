import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, RotateCcw, Eye, EyeOff, Save, X } from 'lucide-react'
import { useSecretStore } from '../store/secretStore'
import LoadingSpinner from '../components/LoadingSpinner'

interface SecretFormData {
  name: string
  description: string
  data: string
}

export default function SecretsPage() {
  const { 
    secrets, 
    isLoading, 
    error, 
    fetchSecrets, 
    createSecret, 
    updateSecret, 
    deleteSecret, 
    rotateSecret,
    clearError 
  } = useSecretStore()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showRotateModal, setShowRotateModal] = useState(false)
  const [selectedSecret, setSelectedSecret] = useState<any>(null)
  const [formData, setFormData] = useState<SecretFormData>({
    name: '',
    description: '',
    data: ''
  })
  const [showData, setShowData] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchSecrets()
  }, [fetchSecrets])

  const handleCreateSecret = async () => {
    try {
      const secretData = JSON.parse(formData.data)
      const success = await createSecret(formData.name, secretData, formData.description)
      if (success) {
        setShowCreateModal(false)
        setFormData({ name: '', description: '', data: '' })
      }
    } catch (error) {
      console.error('Invalid JSON data:', error)
    }
  }

  const handleUpdateSecret = async () => {
    try {
      const secretData = JSON.parse(formData.data)
      const success = await updateSecret(selectedSecret.name, secretData, formData.description)
      if (success) {
        setShowEditModal(false)
        setSelectedSecret(null)
        setFormData({ name: '', description: '', data: '' })
      }
    } catch (error) {
      console.error('Invalid JSON data:', error)
    }
  }

  const handleDeleteSecret = async () => {
    const success = await deleteSecret(selectedSecret.name)
    if (success) {
      setShowDeleteModal(false)
      setSelectedSecret(null)
    }
  }

  const handleRotateSecret = async () => {
    try {
      const secretData = JSON.parse(formData.data)
      const success = await rotateSecret(selectedSecret.name, secretData)
      if (success) {
        setShowRotateModal(false)
        setSelectedSecret(null)
        setFormData({ name: '', description: '', data: '' })
      }
    } catch (error) {
      console.error('Invalid JSON data:', error)
    }
  }

  const openEditModal = (secret: any) => {
    setSelectedSecret(secret)
    setFormData({
      name: secret.name,
      description: secret.resource,
      data: '{}' // Пользователь должен ввести новые данные
    })
    setShowEditModal(true)
  }

  const openDeleteModal = (secret: any) => {
    setSelectedSecret(secret)
    setShowDeleteModal(true)
  }

  const openRotateModal = (secret: any) => {
    setSelectedSecret(secret)
    setFormData({
      name: secret.name,
      description: secret.resource,
      data: '{}' // Пользователь должен ввести новые данные для ротации
    })
    setShowRotateModal(true)
  }

  const toggleDataVisibility = (secretName: string) => {
    setShowData(prev => ({
      ...prev,
      [secretName]: !prev[secretName]
    }))
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Управление секретами</h1>
          <p className="text-gray-600">Создание, редактирование и удаление секретов</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Создать секрет</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Secrets List */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Название
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Описание
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Запросил
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Создан
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {secrets.map((secret) => (
                <tr key={secret.name}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {secret.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 max-w-xs truncate">
                      {secret.resource}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {secret.requester}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(secret.createdAt).toLocaleDateString('ru-RU')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => openEditModal(secret)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Редактировать"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openRotateModal(secret)}
                      className="text-yellow-600 hover:text-yellow-900"
                      title="Ротировать"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(secret)}
                      className="text-red-600 hover:text-red-900"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {secrets.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">Секреты не найдены</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Secret Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Создать новый секрет</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название секрета
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="my-secret"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Описание секрета"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Данные секрета (JSON)
                </label>
                <textarea
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                  placeholder='{"key": "value", "password": "secret123"}'
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={handleCreateSecret}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Создать</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Secret Modal */}
      {showEditModal && selectedSecret && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Редактировать секрет</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название секрета
                </label>
                <input
                  type="text"
                  value={formData.name}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Новые данные секрета (JSON)
                </label>
                <textarea
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                  placeholder='{"key": "new_value", "password": "new_secret123"}'
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={handleUpdateSecret}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Сохранить</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rotate Secret Modal */}
      {showRotateModal && selectedSecret && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Ротировать секрет</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название секрета
                </label>
                <input
                  type="text"
                  value={formData.name}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Новые данные секрета (JSON)
                </label>
                <textarea
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                  placeholder='{"key": "rotated_value", "password": "new_rotated_secret"}'
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowRotateModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={handleRotateSecret}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 flex items-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Ротировать</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Secret Modal */}
      {showDeleteModal && selectedSecret && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Удалить секрет</h2>
            
            <p className="text-gray-600 mb-4">
              Вы уверены, что хотите удалить секрет <strong>{selectedSecret.name}</strong>? 
              Это действие нельзя отменить.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteSecret}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Удалить</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
