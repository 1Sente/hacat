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
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
      this.authenticate()
    })

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      if (reason === 'io server disconnect') {
        // Server disconnected the client, try to reconnect
        this.handleReconnect()
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      this.handleReconnect()
    })

    // Authentication events
    this.socket.on('authenticated', (data) => {
      console.log('WebSocket authenticated:', data)
      this.joinUserRoom(data.user.id)
    })

    this.socket.on('authentication-error', (error) => {
      console.error('WebSocket authentication failed:', error)
      toast.error('Ошибка аутентификации WebSocket')
    })

    // Request events
    this.socket.on('request-status-changed', (data) => {
      console.log('Request status changed:', data)
      toast.success(`Статус запроса изменен: ${data.status}`)
      // You can dispatch this to a global store or use a callback
      this.onRequestStatusChange?.(data)
    })

    this.socket.on('new-request', (data) => {
      console.log('New request received:', data)
      toast('Получен новый запрос', { icon: 'ℹ️' })
      this.onNewRequest?.(data)
    })

    // Secret events
    this.socket.on('secret-access', (data) => {
      console.log('Secret access notification:', data)
      if (data.success) {
        toast.success('Секрет успешно получен')
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

  private joinUserRoom(userId: string) {
    if (this.socket) {
      this.socket.emit('join-user-room', { userId })
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      
      setTimeout(() => {
        this.connect()
      }, this.reconnectInterval * this.reconnectAttempts)
    } else {
      console.error('Max reconnection attempts reached')
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
  onRequestStatusChange?: (data: any) => void
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
    setOnRequestStatusChange: (callback: (data: any) => void) => {
      webSocketService.onRequestStatusChange = callback
    },
    setOnNewRequest: (callback: (data: any) => void) => {
      webSocketService.onNewRequest = callback
    },
    setOnSecretAccess: (callback: (data: any) => void) => {
      webSocketService.onSecretAccess = callback
    },
  }
}
