import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, ArrowLeft, Send } from 'lucide-react'
import { useRequestStore } from '../store/requestStore'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

export default function RequestFormPage() {
  const navigate = useNavigate()
  const { createRequest, isLoading } = useRequestStore()
  const [formData, setFormData] = useState({
    resource: '',
    reason: ''
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.resource.trim()) {
      newErrors.resource = 'Название ресурса обязательно'
    } else if (formData.resource.trim().length < 3) {
      newErrors.resource = 'Название ресурса должно содержать минимум 3 символа'
    }

    if (!formData.reason.trim()) {
      newErrors.reason = 'Обоснование обязательно'
    } else if (formData.reason.trim().length < 10) {
      newErrors.reason = 'Обоснование должно содержать минимум 10 символов'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Пожалуйста, исправьте ошибки в форме')
      return
    }

    const request = await createRequest(formData.resource.trim(), formData.reason.trim())

    if (request) {
      toast.success('Запрос успешно создан')
      navigate('/requests')
    } else {
      toast.error('Ошибка создания запроса')
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад к дашборду</span>
        </button>
        
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <FileText className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Создать запрос</h1>
            <p className="text-gray-600">Запросить доступ к новому секрету</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Resource Field */}
          <div>
            <label htmlFor="resource" className="block text-sm font-medium text-gray-700 mb-2">
              Название ресурса *
            </label>
            <input
              type="text"
              id="resource"
              name="resource"
              value={formData.resource}
              onChange={handleInputChange}
              placeholder="Например: production-database-credentials"
              className={`input-field ${errors.resource ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              disabled={isLoading}
            />
            {errors.resource && (
              <p className="mt-1 text-sm text-red-600">{errors.resource}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Укажите точное название ресурса или системы, к которой нужен доступ
            </p>
          </div>

          {/* Reason Field */}
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
              Обоснование запроса *
            </label>
            <textarea
              id="reason"
              name="reason"
              rows={4}
              value={formData.reason}
              onChange={handleInputChange}
              placeholder="Опишите, зачем вам нужен доступ к этому ресурсу..."
              className={`input-field resize-none ${errors.reason ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              disabled={isLoading}
            />
            {errors.reason && (
              <p className="mt-1 text-sm text-red-600">{errors.reason}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Минимум 10 символов. Опишите цель и необходимость доступа
            </p>
          </div>

          {/* Guidelines */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Памятка</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Убедитесь, что у вас есть законная необходимость в доступе</li>
              <li>• Ваш запрос будет рассмотрен администратором</li>
              <li>• После одобрения вы получите уведомление</li>
              <li>• Все действия с секретами логируются для аудита</li>
            </ul>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn-secondary"
              disabled={isLoading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center space-x-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Отправить запрос</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
