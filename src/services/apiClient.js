import ky from 'ky'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''

export const apiClient = ky.create({
  prefixUrl: apiBaseUrl || undefined,
  timeout: 15000,
  retry: {
    limit: 1,
    methods: ['get', 'post'],
    statusCodes: [408, 429, 500, 502, 503, 504],
  },
})
