import axios from 'axios'
import { clearStoredAuthSession, getStoredAuthSession } from '@shared-auth/services/authStorage'
import { useAuthStore } from '@vendor/stores/auth.store'

const DEV_VENDOR_ID = 'a1000000-0000-0000-0000-000000000001'

export const vendorClient = axios.create({
  baseURL: import.meta.env.VITE_VENDOR_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8083/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

export const auctionClient = axios.create({
  baseURL: import.meta.env.VITE_AUCTION_API_URL || 'http://localhost:8082/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

const attachHeaders = (config: any) => {
  const token = getStoredAuthSession()?.tokens.accessToken ?? useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  config.headers['X-Vendor-Id'] = useAuthStore.getState().vendor?.id ?? DEV_VENDOR_ID
  return config
}

vendorClient.interceptors.request.use(attachHeaders)
auctionClient.interceptors.request.use(attachHeaders)

const handleResponseError = (error: any) => {
  if (error.response?.status === 401) {
    useAuthStore.getState().logout()
    clearStoredAuthSession()
    window.location.assign('/login')
  }
  return Promise.reject(error)
}

vendorClient.interceptors.response.use(
  (response) => response,
  handleResponseError
)

auctionClient.interceptors.response.use(
  (response) => response,
  handleResponseError
)

export default vendorClient
