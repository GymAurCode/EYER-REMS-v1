import axios from 'axios'

/**
 * API Base URL Configuration
 * 
 * For Next.js projects, use NEXT_PUBLIC_API_URL environment variable
 * This variable is accessible in the browser (prefixed with NEXT_PUBLIC_)
 * 
 * Example .env.local:
 * NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
 * 
 * For development:
 * NEXT_PUBLIC_API_URL=http://localhost:3001/api
 */
const rawBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api` : 'https://eyer-rems-v1-production-f00e.up.railway.app/api'
// Normalize the base URL: remove trailing slashes, ensure it ends with /api (no trailing slash)
let normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, '') // Remove trailing slashes
// Ensure the base URL includes /api
if (!normalizedBaseUrl.endsWith('/api')) {
  // If it doesn't end with /api, check if it's just the domain
  if (!normalizedBaseUrl.includes('/api')) {
    normalizedBaseUrl = `${normalizedBaseUrl}/api`
  }
}
// Don't add trailing slash - axios will handle URL combination correctly
// baseURL: http://localhost:3001/api + URL: /auth/login = http://localhost:3001/api/auth/login

// Log API configuration in development (disabled)
// if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
//   console.log('🔧 API Configuration:', {
//     rawBaseUrl,
//     normalizedBaseUrl,
//     envVar: process.env.NEXT_PUBLIC_API_URL || 'not set (using default)',
//   })
// }

// Request throttling and deduplication
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 150 // Minimum 150ms between GET requests
const MAX_CONCURRENT_REQUESTS = 8
let activeRequests = 0

// Request deduplication cache (prevents duplicate simultaneous requests)
const pendingRequests = new Map<string, Promise<any>>()

// Helper to throttle requests
const throttleRequest = async (): Promise<void> => {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest))
  }
  
  lastRequestTime = Date.now()
}

// Create axios instance with default config
const api = axios.create({
  baseURL: normalizedBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // Increased to 30 seconds for slow queries
  withCredentials: true, // Required for CORS with credentials
})

// Request interceptor to add auth token, deviceId, CSRF token, and throttling
api.interceptors.request.use(
  (config) => {
    // Ensure URLs start with / for proper axios URL combination
    if (config.url && !config.url.startsWith('/')) {
      config.url = `/${config.url}`
    }

    // Only access sessionStorage on client-side to avoid hydration issues
    if (typeof window === 'undefined') {
      return config
    }

    // Check for 24-hour session expiration (from login time)
    const loginTime = localStorage.getItem('loginTime')
    if (loginTime) {
      const loginTimestamp = parseInt(loginTime, 10)
      const now = Date.now()
      const hoursSinceLogin = (now - loginTimestamp) / (1000 * 60 * 60)

      if (hoursSinceLogin >= 24) {
        throw new Error('Session expired after 24 hours')
      }
    }

    // Update last activity timestamp (for activity tracking)
    sessionStorage.setItem('lastActivity', Date.now().toString())

    // Add auth token if available (from localStorage for persistence)
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Add deviceId header for session isolation
    const deviceId = sessionStorage.getItem('deviceId')
    if (deviceId && config.headers) {
      config.headers['X-Device-Id'] = deviceId
    }

    // Add CSRF token and session ID for state-changing requests
    const method = config.method?.toUpperCase()
    if (method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const csrfToken = sessionStorage.getItem('csrfToken')
      const sessionId = sessionStorage.getItem('sessionId')

      if (csrfToken && config.headers) {
        config.headers['x-csrf-token'] = csrfToken
      }

      if (sessionId && config.headers) {
        config.headers['X-Session-Id'] = sessionId
      }
    }

    // Throttle GET requests only (skip throttling for POST/PUT/DELETE to avoid blocking user actions)
    // Increment counter for GET requests (will be decremented in response/error handlers)
    if (method === 'GET' && typeof window !== 'undefined') {
      activeRequests++
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling, CSRF token updates, and token refresh
api.interceptors.response.use(
  (response) => {
    // Decrement active request counter for GET requests
    if (response.config.method?.toUpperCase() === 'GET' && typeof window !== 'undefined') {
      activeRequests = Math.max(0, activeRequests - 1)
    }

    // Update last activity on successful response
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('lastActivity', Date.now().toString())

      // Update CSRF token and session ID if provided in response
      const responseData = response.data as any
      const csrfToken = response.headers['x-csrf-token'] || responseData?.csrfToken
      const sessionId = response.headers['x-session-id'] || responseData?.sessionId

      if (csrfToken) {
        sessionStorage.setItem('csrfToken', csrfToken)
      }

      if (sessionId) {
        sessionStorage.setItem('sessionId', sessionId)
      }

      // Store refresh token from login responses
      if (responseData?.refreshToken) {
        localStorage.setItem('refreshToken', responseData.refreshToken)
      }

      // Update access token if provided in response
      if (responseData?.token) {
        localStorage.setItem('token', responseData.token)
      }
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Log request details in development for debugging (disabled)
    // if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    //   const requestUrl = error.config?.url
    //   const baseURL = error.config?.baseURL
    //   const fullUrl = baseURL && requestUrl ? `${baseURL}${requestUrl}` : requestUrl
    //   console.error('❌ API Request Failed:', {
    //     url: fullUrl,
    //     method: error.config?.method?.toUpperCase(),
    //     status: error.response?.status,
    //     statusText: error.response?.statusText,
    //     message: error.message,
    //   })
    // }

    // Log failures for easier debugging in browser/console (skip 429 and timeout errors to reduce noise)
    const isTimeoutError = error.code === 'ECONNABORTED' || error.message?.includes('timeout')
    if (error.response?.status !== 429 && !isTimeoutError) {
      console.error('API request failed', {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
      })
    }

    // Handle timeout errors - retry once with longer timeout
    if (isTimeoutError && !originalRequest._retry) {
      originalRequest._retry = true
      originalRequest.timeout = 60000 // Increase timeout to 60 seconds for retry
      
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      return api(originalRequest)
    }

    // Handle 429 Too Many Requests - add retry with exponential backoff
    if (error.response?.status === 429) {
      const retryCount = (originalRequest._retryCount as number) || 0
      const maxRetries = 2
      
      if (retryCount < maxRetries) {
        originalRequest._retry = true
        originalRequest._retryCount = retryCount + 1
        
        // Exponential backoff: 2s, 4s (longer delays for rate limits)
        const delay = Math.pow(2, retryCount + 1) * 1000
        
        // Clear from pending requests to allow retry
        if (originalRequest.url) {
          const requestKey = `${originalRequest.method?.toUpperCase()}:${originalRequest.url}`
          pendingRequests.delete(requestKey)
        }
        
        await new Promise(resolve => setTimeout(resolve, delay))
        
        return api(originalRequest)
      } else {
        // Don't log 429 errors to reduce console noise
        return Promise.reject(error)
      }
    }

    // Handle 401 Unauthorized - attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      if (typeof window !== 'undefined') {
        const refreshToken = localStorage.getItem('refreshToken')

        // Only attempt refresh if we have a refresh token and it's not a login endpoint
        if (refreshToken && !originalRequest.url?.includes('/auth/login') &&
          !originalRequest.url?.includes('/auth/role-login') &&
          !originalRequest.url?.includes('/auth/invite-login')) {
          try {
            // Attempt to refresh the token
            const refreshUrl = `${normalizedBaseUrl}/auth/refresh`
            const response = await axios.post(
              refreshUrl,
              { refreshToken },
              {
                headers: {
                  'Content-Type': 'application/json',
                },
                withCredentials: true, // Required for CORS with credentials
              }
            )

            const responseData = response.data as any
            const { token, refreshToken: newRefreshToken, csrfToken, sessionId } = responseData

            // Update tokens
            if (token) {
              localStorage.setItem('token', token)
              originalRequest.headers.Authorization = `Bearer ${token}`
            }

            if (newRefreshToken) {
              localStorage.setItem('refreshToken', newRefreshToken)
            }

            if (csrfToken) {
              sessionStorage.setItem('csrfToken', csrfToken)
            }

            if (sessionId) {
              sessionStorage.setItem('sessionId', sessionId)
            }

            // Retry the original request with new token
            return api(originalRequest)
          } catch (refreshError) {
            // Refresh failed - clear tokens and redirect to login
            localStorage.removeItem('token')
            localStorage.removeItem('refreshToken')
            localStorage.removeItem('erp-user')
            localStorage.removeItem('loginTime')
            sessionStorage.removeItem('deviceId')
            sessionStorage.removeItem('csrfToken')
            sessionStorage.removeItem('sessionId')
            sessionStorage.removeItem('lastActivity')

            // Don't redirect if already on a login page
            const currentPath = window.location.pathname
            if (currentPath !== '/login' && currentPath !== '/roles/login' && currentPath !== '/invite-login') {
              window.location.href = '/login'
            }
            return Promise.reject(refreshError)
          }
        }
      }
    }

    // Handle 500 Internal Server Error - show detailed error message
    if (error.response?.status === 500) {
      const errorData = error.response?.data
      const errorMessage = errorData?.message || errorData?.error || 'Internal server error'

      // Error logging disabled
      // if (typeof window !== 'undefined') {
      //   console.error('❌ 500 Internal Server Error:', {
      //     message: errorMessage,
      //     details: errorData?.details,
      //     stack: errorData?.stack,
      //     url: error.config?.url,
      //   })
      // }
    }

    // Handle 404 Not Found - provide helpful error message
    if (error.response?.status === 404) {
      const requestUrl = error.config?.url
      const baseURL = error.config?.baseURL
      // Construct the full URL correctly
      const base = baseURL?.replace(/\/+$/, '') || ''
      const url = requestUrl?.startsWith('/') ? requestUrl : `/${requestUrl || ''}`
      const fullUrl = `${base}${url}`

      // Error logging disabled
      // if (typeof window !== 'undefined') {
      //   console.error('❌ 404 Error - Endpoint not found:', {
      //     fullUrl,
      //     baseURL,
      //     endpoint: requestUrl,
      //     suggestion: 'Make sure the backend server is running on port 3001 and the endpoint exists',
      //   })
      // }
    }

    // Handle 401 Unauthorized (after refresh attempt or no refresh token)
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login and clear localStorage
      // But don't redirect if already on a login page (let the page handle the error)
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname
        // Don't redirect if already on a login page
        if (currentPath === '/login' || currentPath === '/roles/login' || currentPath === '/invite-login') {
          // Just clear the session, don't redirect - let the login page handle the error
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('erp-user')
          localStorage.removeItem('loginTime')
          sessionStorage.removeItem('deviceId')
          sessionStorage.removeItem('csrfToken')
          sessionStorage.removeItem('sessionId')
          sessionStorage.removeItem('lastActivity')
          return Promise.reject(error)
        }

        // Don't redirect if error is from chat API - let the component handle it
        const requestUrl = error.config?.url || ''
        if (requestUrl.includes('/chat')) {
          // Just reject the error, don't redirect - let the chat component handle it
          return Promise.reject(error)
        }

        // Check if user was previously a role-based user
        const storedUser = localStorage.getItem('erp-user')
        if (storedUser && storedUser.trim() !== '' && storedUser !== 'null' && storedUser !== 'undefined') {
          try {
            const parsedUser = JSON.parse(storedUser)
            if (parsedUser && typeof parsedUser === 'object' && parsedUser.role?.toLowerCase() !== 'admin') {
              localStorage.removeItem('token')
              localStorage.removeItem('refreshToken')
              localStorage.removeItem('erp-user')
              localStorage.removeItem('loginTime')
              sessionStorage.removeItem('deviceId')
              sessionStorage.removeItem('csrfToken')
              sessionStorage.removeItem('sessionId')
              sessionStorage.removeItem('lastActivity')
              window.location.href = '/roles/login'
              return Promise.reject(error)
            }
          } catch (e) {
            // If parsing fails, default to admin login
          }
        }

        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('erp-user')
        localStorage.removeItem('loginTime')
        sessionStorage.removeItem('deviceId')
        sessionStorage.removeItem('csrfToken')
        sessionStorage.removeItem('sessionId')
        sessionStorage.removeItem('lastActivity')
        window.location.href = '/login'
      }
    }
    // Handle CSRF token errors (403)
    if (error.response?.status === 403 &&
      (error.response?.data?.error?.includes('CSRF') ||
        error.response?.data?.message?.includes('CSRF'))) {
      if (typeof window !== 'undefined') {
        // Clear CSRF token to force regeneration on next request
        sessionStorage.removeItem('csrfToken')
        sessionStorage.removeItem('sessionId')

        // Don't redirect - let the user retry the action
        // The next request will get a new CSRF token from the server
        return Promise.reject(error)
      }
    }

    // Handle device mismatch (403 with specific error)
    if (error.response?.status === 403 && error.response?.data?.error === 'Device ID mismatch') {
      // Device ID mismatch - clear session and redirect
      // But don't redirect if already on a login page
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname
        // Don't redirect if already on a login page
        if (currentPath === '/login' || currentPath === '/roles/login' || currentPath === '/invite-login') {
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('erp-user')
          localStorage.removeItem('loginTime')
          sessionStorage.removeItem('deviceId')
          sessionStorage.removeItem('csrfToken')
          sessionStorage.removeItem('sessionId')
          sessionStorage.removeItem('lastActivity')
          return Promise.reject(error)
        }

        // Check if user was previously a role-based user
        const storedUser = localStorage.getItem('erp-user')
        if (storedUser && storedUser.trim() !== '' && storedUser !== 'null' && storedUser !== 'undefined') {
          try {
            const parsedUser = JSON.parse(storedUser)
            if (parsedUser && typeof parsedUser === 'object' && parsedUser.role?.toLowerCase() !== 'admin') {
              localStorage.removeItem('token')
              localStorage.removeItem('refreshToken')
              localStorage.removeItem('erp-user')
              localStorage.removeItem('loginTime')
              sessionStorage.removeItem('deviceId')
              sessionStorage.removeItem('csrfToken')
              sessionStorage.removeItem('sessionId')
              sessionStorage.removeItem('lastActivity')
              window.location.href = '/roles/login'
              return Promise.reject(error)
            }
          } catch (e) {
            // If parsing fails, default to admin login
          }
        }

        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('erp-user')
        localStorage.removeItem('loginTime')
        sessionStorage.removeItem('deviceId')
        sessionStorage.removeItem('csrfToken')
        sessionStorage.removeItem('sessionId')
        sessionStorage.removeItem('lastActivity')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// API endpoints
export const apiService = {
  // Properties
  properties: {
    getAll: (params?: { search?: string; locationId?: string }) => {
      const queryParams = new URLSearchParams()
      if (params?.search) queryParams.append('search', params.search)
      if (params?.locationId) queryParams.append('locationId', params.locationId)
      const queryString = queryParams.toString()
      return api.get(`/properties${queryString ? `?${queryString}` : ''}`)
    },
    getById: (id: string) => api.get(`/properties/${id}`),
    getReport: (id: string) => api.get(`/properties/${id}/report`, { responseType: 'blob' }),
    getLedger: (id: string) => api.get(`/properties/${id}/ledger`),
    create: (data: any) => api.post('/properties', data),
    update: (id: string, data: any) => api.put(`/properties/${id}`, data),
    delete: (id: string) => api.delete(`/properties/${id}`),
    getStructure: (id: string) => api.get(`/properties/${id}/structure`),
    createFloor: (id: string, data: any) => api.post(`/properties/${id}/floors`, data),
  },

  locations: {
    getTree: () => api.get('/locations/tree'),
    getChildren: (id: string) => api.get(`/locations/${id}/children`),
    getSubtree: (id: string) => api.get(`/locations/${id}/subtree`),
    search: (query: string) => api.get(`/locations/search?q=${encodeURIComponent(query)}`),
    create: (data: { name: string; type: string; parentId?: string | null }) => api.post('/locations', data),
    update: (id: string, data: { name?: string; type?: string; parentId?: string | null }) => api.put(`/locations/${id}`, data),
    delete: (id: string) => api.delete(`/locations/${id}`),
  },

  // Units
  units: {
    getAll: () => api.get('/units'),
    getById: (id: string) => api.get(`/units/${id}`),
    create: (data: any) => api.post('/units', data),
    update: (id: string, data: any) => api.put(`/units/${id}`, data),
    delete: (id: string) => api.delete(`/units/${id}`),
    getFloorAnalytics: (propertyId: string) => api.get(`/units/analytics/floors/${propertyId}`),
    createForFloor: (floorId: string, data: any) => api.post(`/units/floors/${floorId}/units`, data),
  },

  // Tenants
  tenants: {
    getAll: (params?: { blockId?: string; propertyId?: string; unitId?: string; search?: string }) => {
      const queryParams = new URLSearchParams()
      if (params?.blockId) queryParams.append('blockId', params.blockId)
      if (params?.propertyId) queryParams.append('propertyId', params.propertyId)
      if (params?.unitId) queryParams.append('unitId', params.unitId)
      if (params?.search) queryParams.append('search', params.search)
      const queryString = queryParams.toString()
      return api.get(`/tenants${queryString ? `?${queryString}` : ''}`)
    },
    getById: (id: string) => api.get(`/tenants/${id}`),
    create: (data: any) => api.post('/tenants', data),
    update: (id: string, data: any) => api.put(`/tenants/${id}`, data),
    delete: (id: string) => api.delete(`/tenants/${id}`),
  },

  // Tenant Portal
  tenantPortal: {
    getDashboard: (id: string) => api.get(`/tenant-portal/${id}/dashboard`),
    getLedger: (id: string) => api.get(`/tenant-portal/${id}/ledger`),
    pay: (id: string, data: any) => api.post(`/tenant-portal/${id}/pay`, data),
    createTicket: (id: string, data: any) => api.post(`/tenant-portal/${id}/ticket`, data),
    getTickets: (id: string, status?: string) => {
      const url = `/tenant-portal/${id}/tickets${status ? `?status=${status}` : ''}`
      return api.get(url)
    },
    submitNotice: (id: string, data: any) => api.post(`/tenant-portal/${id}/notice`, data),
    getReceipt: (id: string, paymentId: string) => api.get(`/tenant-portal/${id}/receipt/${paymentId}`),
  },

  // Announcements
  announcements: {
    getAll: () => api.get('/announcements'),
    create: (data: any) => api.post('/announcements', data),
    update: (id: string, data: any) => api.put(`/announcements/${id}`, data),
    delete: (id: string) => api.delete(`/announcements/${id}`),
  },

  // Maintenance Tickets
  maintenanceTickets: {
    getAll: () => api.get('/maintenance-tickets'),
    getById: (id: string) => api.get(`/maintenance-tickets/${id}`),
    create: (data: any) => api.post('/maintenance-tickets', data),
    update: (id: string, data: any) => api.put(`/maintenance-tickets/${id}`, data),
    delete: (id: string) => api.delete(`/maintenance-tickets/${id}`),
  },

  // Ledger (for backward compatibility)
  ledger: {
    getByTenant: (tenantId: string) => api.get(`/tenant-portal/${tenantId}/ledger`),
    getPropertyLedger: (propertyId?: string | null) =>
      api.get('/finance/ledgers/properties', { params: propertyId ? { propertyId } : {} }),
  },

  // Uploads (enhanced)
  uploads: {
    upload: (formData: FormData) => api.post('/upload/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  },

  // Sales
  sales: {
    getAll: () => api.get('/sales'),
    getById: (id: string) => api.get(`/sales/${id}`),
    create: (data: any) => api.post('/sales', data),
    update: (id: string, data: any) => api.put(`/sales/${id}`, data),
    delete: (id: string) => api.delete(`/sales/${id}`),
    // Installments
    getInstallments: (saleId: string) => api.get(`/sales/${saleId}/installments`),
    createInstallments: (saleId: string, installments: any[]) => api.post(`/sales/${saleId}/installments`, { installments }),
    updateInstallment: (id: string, data: any) => api.put(`/sales/installments/${id}`, data),
    deleteInstallment: (id: string) => api.delete(`/sales/installments/${id}`),
  },

  // Buyers
  buyers: {
    getAll: () => api.get('/buyers'),
    getById: (id: number) => api.get(`/buyers/${id}`),
    create: (data: any) => api.post('/buyers', data),
    update: (id: number, data: any) => api.put(`/buyers/${id}`, data),
    delete: (id: number) => api.delete(`/buyers/${id}`),
  },

  // Leases
  leases: {
    getAll: () => api.get('/leases'),
    getById: (id: string) => api.get(`/leases/${id}`),
    create: (data: any) => api.post('/leases', data),
    update: (id: string, data: any) => api.put(`/leases/${id}`, data),
    delete: (id: string) => api.delete(`/leases/${id}`),
  },

  // Blocks
  blocks: {
    getAll: () => api.get('/blocks'),
    getById: (id: string) => api.get(`/blocks/${id}`),
    create: (data: any) => api.post('/blocks', data),
    update: (id: string, data: any) => api.put(`/blocks/${id}`, data),
    delete: (id: string) => api.delete(`/blocks/${id}`),
  },

  // Floors
  floors: {
    getByProperty: (propertyId: string) => api.get(`/floors/property/${propertyId}`),
    getAll: () => api.get('/floors'),
    getById: (id: string) => api.get(`/floors/${id}`),
    create: (data: any) => api.post('/floors', data),
    update: (id: string, data: any) => api.put(`/floors/${id}`, data),
    delete: (id: string) => api.delete(`/floors/${id}`),
  },

  // CRM - Leads
  leads: {
    getAll: () => api.get('/crm/leads'),
    getById: (id: string | number) => api.get(`/crm/leads/${id}`),
    create: (data: any) => api.post('/crm/leads', data),
    update: (id: string | number, data: any) => api.put(`/crm/leads/${id}`, data),
    delete: (id: string | number) => api.delete(`/crm/leads/${id}`),
    convertToClient: (id: string) => api.post(`/crm/leads/${id}/convert`),
  },

  // CRM - Clients
  clients: {
    getAll: () => api.get('/crm/clients'),
    getById: (id: string) => api.get(`/crm/clients/${id}`),
    create: (data: any) => api.post('/crm/clients', data),
    update: (id: string, data: any) => api.put(`/crm/clients/${id}`, data),
    delete: (id: string) => api.delete(`/crm/clients/${id}`),
  },

  // CRM - Deals
  deals: {
    getAll: () => api.get('/crm/deals'),
    getById: (id: string) => api.get(`/crm/deals/${id}`),
    create: (data: any) => api.post('/crm/deals', data),
    update: (id: string, data: any) => api.put(`/crm/deals/${id}`, data),
    delete: (id: string) => api.delete(`/crm/deals/${id}`),
    // Payment Plan methods
    getPaymentPlan: (dealId: string) => api.get(`/crm/deals/${dealId}/payment-plan`),
    getPaymentPlanPDF: (dealId: string) => api.get(`/crm/deals/${dealId}/payment-plan/pdf`, { responseType: 'blob' }),
    createPaymentPlan: (dealId: string, data: any) => api.post(`/crm/deals/${dealId}/payment-plan`, data),
    updatePaymentPlan: (planId: string, data: any) => api.put(`/crm/payment-plan/${planId}`, data),
    createPayment: (dealId: string, data: any) => api.post(`/crm/deals/${dealId}/payments`, data),
    smartAllocatePayment: (dealId: string, data: { amount: number; method: string }) =>
      api.patch(`/crm/deals/${dealId}/payments/smart-allocate`, data),
  },

  // CRM - Dealers
  dealers: {
    getAll: () => api.get('/crm/dealers'),
    getById: (id: string) => api.get(`/crm/dealers/${id}`),
    create: (data: any) => api.post('/crm/dealers', data),
    update: (id: string, data: any) => api.put(`/crm/dealers/${id}`, data),
    delete: (id: string) => api.delete(`/crm/dealers/${id}`),
  },

  // CRM - Communications
  communications: {
    getAll: () => api.get('/crm/communications'),
    getById: (id: string) => api.get(`/crm/communications/${id}`),
    create: (data: any) => api.post('/crm/communications', data),
    update: (id: string, data: any) => api.put(`/crm/communications/${id}`, data),
    delete: (id: string) => api.delete(`/crm/communications/${id}`),
  },

  // HR - Employees
  employees: {
    getAll: () => api.get('/hr/employees'),
    getById: (id: string) => api.get(`/hr/employees/${id}`),
    create: (data: any) => api.post('/hr/employees', data),
    update: (id: string, data: any) => api.put(`/hr/employees/${id}`, data),
    delete: (id: string) => api.delete(`/hr/employees/${id}`),
  },

  // HR - Attendance
  attendance: {
    getAll: () => api.get('/hr/attendance'),
    getById: (id: number) => api.get(`/hr/attendance/${id}`),
    create: (data: any) => api.post('/hr/attendance', data),
    update: (id: number, data: any) => api.put(`/hr/attendance/${id}`, data),
    delete: (id: number) => api.delete(`/hr/attendance/${id}`),
    checkIn: (data: any) => api.post('/hr/attendance/checkin', data),
    checkOut: (data: any) => api.post('/hr/attendance/checkout', data),
  },

  // HR - Payroll
  payroll: {
    getAll: (params?: Record<string, any>) => api.get('/hr/payroll', { params }),
    getById: (id: number) => api.get(`/hr/payroll/${id}`),
    create: (data: any) => api.post('/hr/payroll', data),
    update: (id: number, data: any) => api.put(`/hr/payroll/${id}`, data),
    delete: (id: number) => api.delete(`/hr/payroll/${id}`),
  },

  // HR - Leave
  leave: {
    getAll: (params?: Record<string, any>) => api.get('/hr/leave', { params }),
    getById: (id: number) => api.get(`/hr/leave/${id}`),
    create: (data: any) => api.post('/hr/leave', data),
    update: (id: number, data: any) => api.put(`/hr/leave/${id}`, data),
    delete: (id: number) => api.delete(`/hr/leave/${id}`),
    approve: (id: string) => api.post(`/hr/leave/${id}/approve`),
    reject: (id: string) => api.post(`/hr/leave/${id}/reject`),
  },

  // Finance - Summary
  finance: {
    getSummary: (params?: { propertyId?: string; startDate?: string; endDate?: string }) =>
      api.get('/finance/summary', { params }),
    getAccountLedger: (accountId: string, params?: { propertyId?: string; startDate?: string; endDate?: string }) =>
      api.get(`/finance-reports/ledger/account/${accountId}`, { params }),
  },

  // Finance - Transactions
  transactions: {
    getAll: () => api.get('/finance/transactions', { timeout: 30000 }),
    getById: (id: number) => api.get(`/finance/transactions/${id}`),
    create: (data: any) => api.post('/finance/transactions', data),
    update: (id: number, data: any) => api.put(`/finance/transactions/${id}`, data),
    delete: (id: number) => api.delete(`/finance/transactions/${id}`),
  },

  // Finance - Invoices
  invoices: {
    getAll: () => api.get('/finance/invoices'),
    getById: (id: number) => api.get(`/finance/invoices/${id}`),
    create: (data: any) => api.post('/finance/invoices', data),
    update: (id: number, data: any) => api.put(`/finance/invoices/${id}`, data),
    delete: (id: number) => api.delete(`/finance/invoices/${id}`),
  },

  // Finance - Payments
  payments: {
    getAll: () => api.get('/finance/payments'),
    getById: (id: number) => api.get(`/finance/payments/${id}`),
    create: (data: any) => api.post('/finance/payments', data),
    update: (id: number, data: any) => api.put(`/finance/payments/${id}`, data),
    delete: (id: number) => api.delete(`/finance/payments/${id}`),
  },

  // Finance - Commissions
  commissions: {
    getAll: () => api.get('/finance/commissions'),
    getById: (id: string) => api.get(`/finance/commissions/${id}`),
    create: (data: any) => api.post('/finance/commissions', data),
    update: (id: string, data: any) => api.put(`/finance/commissions/${id}`, data),
    delete: (id: string) => api.delete(`/finance/commissions/${id}`),
  },

  // Finance - Accounts (Chart of Accounts)
  accounts: {
    getAll: () => api.get('/finance/accounts'),
    getById: (id: string) => api.get(`/finance/accounts/${id}`),
    create: (data: any) => api.post('/finance/accounts', data),
    update: (id: string, data: any) => api.put(`/finance/accounts/${id}`, data),
    delete: (id: string) => api.delete(`/finance/accounts/${id}`),
  },

  transactionCategories: {
    getAll: () => api.get('/finance/transaction-categories'),
    create: (data: any) => api.post('/finance/transaction-categories', data),
    update: (id: string, data: any) => api.put(`/finance/transaction-categories/${id}`, data),
    delete: (id: string) => api.delete(`/finance/transaction-categories/${id}`),
  },

  // Finance - Journal Vouchers
  journals: {
    getAll: () => api.get('/finance/journals'),
    getById: (id: string) => api.get(`/finance/journals/${id}`),
    create: (data: {
      date: string
      description?: string
      narration?: string
      attachments?: any[]
      preparedByUserId?: string
      approvedByUserId?: string
      status?: string
      lines: {
        accountId: string
        debit?: number
        credit?: number
        description?: string
      }[]
    }) => api.post('/finance/journals', data),
    delete: (id: string) => api.delete(`/finance/journals/${id}`),
  },

  vouchers: {
    getAll: () => api.get('/finance/vouchers'),
    create: (data: any) => api.post('/finance/vouchers', data),
    delete: (id: string) => api.delete(`/finance/vouchers/${id}`),
  },

  // Finance - Payment Plans
  paymentPlans: {
    create: (data: any) => api.post('/finance/payment-plans/create', data),
    getAll: (filters?: any) => api.get('/finance/payment-plans', { params: filters }),
    getByDealId: (dealId: string) => api.get(`/finance/payment-plans/deal/${dealId}`),
    update: (id: string, data: any) => api.put(`/finance/payment-plans/update/${id}`, data),
    getReports: (filters?: any) => api.get('/finance/payment-plans/reports', { params: filters }),
    updateInstallment: (id: string, data: any) => api.put(`/finance/installments/${id}`, data),
    recordPayment: (id: string, data: any) => api.post(`/finance/installments/${id}/payment`, data),
  },

  // Finance - Receipts
  receipts: {
    create: (data: any) => api.post('/finance/receipts/create', data),
    getByDealId: (dealId: string) => api.get(`/finance/receipts/${dealId}`),
    getPDF: (id: string) => api.get(`/finance/receipts/pdf/${id}`, { responseType: 'blob' }),
    generate: (paymentId: string) => api.get(`/receipts/generate/${paymentId}`),
    getByTenant: (tenantId: string) => api.get(`/receipts/tenant/${tenantId}`),
    export: (filters?: any) => api.get('/finance/receipts/export', { params: filters, responseType: 'blob' }),
  },

  // Finance - Dealer Ledger
  dealerLedger: {
    getLedger: (dealerId: string, filters?: any) => api.get(`/finance/dealer-ledger/${dealerId}`, { params: filters }),
    getBalance: (dealerId: string) => api.get(`/finance/dealer-ledger/${dealerId}/balance`),
    recordPayment: (dealerId: string, data: any) => api.post(`/finance/dealer-ledger/${dealerId}/payment`, data),
  },

  // Finance - Ledgers
  ledgers: {
    clients: () => api.get('/finance/ledgers/clients'),
    properties: () => api.get('/finance/ledgers/properties'),
    company: () => api.get('/finance/ledgers/company'),
  },

  // Stats (with longer timeout for slow queries)
  stats: {
    getPropertiesStats: () => api.get('/stats/properties', { timeout: 30000 }),
    getHRStats: () => api.get('/stats/hr', { timeout: 30000 }),
    getCRMStats: () => api.get('/stats/crm', { timeout: 30000 }),
    getFinanceStats: () => api.get('/stats/finance', { timeout: 30000 }),
    getRevenueVsExpense: (months: number = 12) => api.get(`/stats/finance/revenue-vs-expense?months=${months}`, { timeout: 30000 }),
  },

  // Authentication
  auth: {
    login: (data: { email: string; password: string; deviceId?: string }) =>
      api.post('/auth/login', data),
    roleLogin: (data: { username: string; password: string; deviceId?: string }) =>
      api.post('/auth/role-login', data),
    inviteLogin: (data: { token: string; password: string; username?: string; deviceId?: string }) =>
      api.post('/auth/invite-login', data),
    refresh: (data: { refreshToken: string }) =>
      api.post('/auth/refresh', data),
    logout: (data?: { refreshToken?: string }) =>
      api.post('/auth/logout', data || {}),
    getMe: () => api.get('/auth/me'),
    getRoles: () => api.get('/roles'),
    getRoleById: (id: string) => api.get(`/roles/${id}`),
    createRole: (data: {
      name: string
      permissions?: string[]
      username: string
      email: string
      password: string
      phoneNumber?: string
    }) => api.post('/roles', data),
    updateRole: (id: string, data: { permissions: string[] }) =>
      api.put(`/roles/${id}`, data),
    generateInviteLink: (data: {
      roleId: string
      username: string
      email: string
      password: string
      message?: string
      expiresInDays?: number
    }) => api.post('/roles/generate-invite', data),
    getInviteLinks: (roleId: string) => api.get(`/roles/${roleId}/invites`),
    getUsersByRole: (roleId: string) => api.get(`/roles/${roleId}/users`),
    getInviteLinkByToken: (token: string) => api.get(`/roles/invite/${token}`),
    getNotifications: () => api.get('/notifications'),
    markNotificationRead: (id: string) =>
      api.patch(`/notifications/${id}/read`),
    markAllNotificationsRead: () => api.patch('/notifications/read-all'),
    getUnreadNotificationCount: () => api.get('/notifications/unread-count'),
  },

  // Upload
  upload: {
    image: (data: { image: string; filename?: string }) =>
      api.post('/upload/image', data),
    file: (data: { file: string; filename?: string }) =>
      api.post('/upload/file', data),
  },

  // Chat
  chat: {
    getMessages: () => api.get('/chat'),
    sendMessage: (data: { content: string }) => api.post('/chat', data),
    deleteMessage: (id: string) => api.delete(`/chat/${id}`),
  },

  advanced: {
    getDropdownCategories: () => api.get('/advanced-options/dropdowns'),
    createCategory: (data: { key: string; name: string; description?: string }) =>
      api.post('/advanced-options/dropdowns', data),
    getDropdownByKey: (key: string) => api.get(`/advanced-options/dropdowns/${key}`),
    createOption: (key: string, data: { label: string; value: string; sortOrder?: number }) =>
      api.post(`/advanced-options/dropdowns/${key}`, data),
    updateOption: (id: string, data: { label?: string; value?: string; sortOrder?: number }) =>
      api.put(`/advanced-options/dropdowns/options/${id}`, data),
    deleteOption: (id: string) => api.delete(`/advanced-options/dropdowns/options/${id}`),
    getAmenities: () => api.get('/advanced-options/amenities'),
    createAmenity: (data: { name: string; description?: string; icon?: string }) =>
      api.post('/advanced-options/amenities', data),
    updateAmenity: (id: string, data: { name?: string; description?: string; icon?: string; isActive?: boolean }) =>
      api.put(`/advanced-options/amenities/${id}`, data),
    deleteAmenity: (id: string) => api.delete(`/advanced-options/amenities/${id}`),
    export: (data: { tables: string[] }) => api.post('/advanced-options/export', data),
    import: (data: { table: string; rows: any[] }) => api.post('/advanced-options/import', data),
    exportFullCsv: () =>
      api.get('/advanced-options/export/full-csv', {
        responseType: 'blob',
        headers: { 'Accept': 'text/csv' },
      }),
    importFullCsv: (csv: string) => api.post('/advanced-options/import/full-csv', { csv }),
  },

  // Backup & Restore
  backup: {
    export: () => api.get('/backup/export'),
    import: (data: any) => api.post('/backup/import', data),
    clearAll: () => api.post('/backup/clear-all'),
  },

  // Bulk Export/Import (CSV)
  bulk: {
    export: () =>
      api.get('/bulk/export', {
        responseType: 'blob',
        headers: { 'Accept': 'text/csv' },
      }),
    import: (csv: string) => api.post('/bulk/import', { csv }),
  },

  // Bulk Export/Import (Excel)
  bulkExcel: {
    export: () =>
      api.get('/bulk/excel/export', {
        responseType: 'blob',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      }),
    import: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post('/bulk/excel/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
  },
}

export default api

