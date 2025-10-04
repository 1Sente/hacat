import { Shield, ArrowRight } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import LoadingSpinner from '../components/LoadingSpinner'

export default function LoginPage() {
  const { login, isLoading } = useAuthStore()

  const handleLogin = async () => {
    await login()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-red-600 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Secret Manager Admin
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Административная панель для управления секретами
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900">
                Вход в административную панель
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Требуются права администратора или одобряющего
              </p>
            </div>

            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full btn-primary flex items-center justify-center space-x-2 py-3"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <span>Войти через Keycloak</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                Доступ только для администраторов и одобряющих
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
