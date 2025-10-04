import { NavLink } from 'react-router-dom'
import { 
  FileText, 
  Clock, 
  Shield,
  Home
} from 'lucide-react'
import { cn } from '../utils/cn'

const navigation = [
  { name: 'Главная', href: '/dashboard', icon: Home },
  { name: 'Создать запрос', href: '/request', icon: FileText },
  { name: 'Мои запросы', href: '/requests', icon: Clock },
]

export default function Sidebar() {
  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
      <nav className="mt-6 px-3">
        <div className="space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-primary-100 text-primary-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
                      isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                    )}
                  />
                  {item.name}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <Shield className="w-4 h-4" />
          <span>Безопасное управление секретами</span>
        </div>
      </div>
    </div>
  )
}
