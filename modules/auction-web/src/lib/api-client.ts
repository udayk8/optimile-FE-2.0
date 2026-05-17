import axios from 'axios'
import { clearStoredAuthSession, getStoredAuthSession } from '@shared-auth/services/authStorage'
import { useAuthStore } from '@auction/stores/auth.store'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor — attach auth token
apiClient.interceptors.request.use((config) => {
  const token = getStoredAuthSession()?.tokens.accessToken ?? useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  config.headers['X-User-Id'] = '71234567-0000-0000-0000-000000000001'
  return config
})

// Response interceptor — handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      clearStoredAuthSession()
      window.location.assign('/login')
    }
    return Promise.reject(error)
  }
)

export default apiClient
