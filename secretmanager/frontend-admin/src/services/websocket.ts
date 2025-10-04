import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

class WebSocketService {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 1000

  connect() {
    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8000'
    
    this.socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    })

    this.setupEventListeners()
  }

  private setupEventListeners() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('Admin WebSocket connected')
      this.reconnectAttempts = 0
      this.authenticate()
    })

    this.socket.on('disconnect', (reason) => {
      console.log('Admin WebSocket disconnected:', reason)
      if (reason === 'io server disconnect') {
        this.handleReconnect()
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('Admin WebSocket connection error:', error)
      this.handleReconnect()
    })

    // Authentication events
    this.socket.on('authenticated', (data) => {
      console.log('Admin WebSocket authenticated:', data)
      this.joinAdminRoom()
    })

    this.socket.on('authentication-error', (error) => {
      console.error('Admin WebSocket authentication failed:', error)
      toast.error('Ошибка аутентификации WebSocket')
    })

    // Request events
    this.socket.on('new-request', (data) => {
      console.log('New request received:', data)
      toast(`Новый запрос от ${data.request.requester?.username}: ${data.request.resource}`, { icon: 'ℹ️' })
      this.onNewRequest?.(data)
    })

    // Secret access events
    this.socket.on('secret-access', (data) => {
      console.log('Secret access notification:', data)
      if (data.success) {
        toast.success('Пользователь получил доступ к секрету')
      } else {
        toast.error('Ошибка доступа к секрету')
      }
      this.onSecretAccess?.(data)
    })

    // System notifications
    this.socket.on('system-notification', (data) => {
      console.log('System notification:', data)
      switch (data.type) {
        case 'info':
          toast(data.message, { icon: 'ℹ️' })
          break
        case 'warning':
          toast(data.message, { icon: '⚠️' })
          break
        case 'error':
          toast.error(data.message)
          break
        default:
          toast(data.message)
      }
    })
  }

  private authenticate() {
    const { token } = useAuthStore.getState()
    if (token && this.socket) {
      this.socket.emit('authenticate', { token })
    }
  }

  private joinAdminRoom() {
    if (this.socket) {
      this.socket.emit('join-admin-room')
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Admin WebSocket attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      
      setTimeout(() => {
        this.connect()
      }, this.reconnectInterval * this.reconnectAttempts)
    } else {
      console.error('Max reconnection attempts reached for admin WebSocket')
      toast.error('Ошибка соединения с сервером')
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  // Event callbacks
  onNewRequest?: (data: any) => void
  onSecretAccess?: (data: any) => void

  // Public methods
  isConnected(): boolean {
    return this.socket?.connected || false
  }

  getSocket(): Socket | null {
    return this.socket
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService()

// Export hook for React components
export const useWebSocket = () => {
  return {
    connect: () => webSocketService.connect(),
    disconnect: () => webSocketService.disconnect(),
    isConnected: () => webSocketService.isConnected(),
    setOnNewRequest: (callback: (data: any) => void) => {
      webSocketService.onNewRequest = callback
    },
    setOnSecretAccess: (callback: (data: any) => void) => {
      webSocketService.onSecretAccess = callback
    },
  }
}
