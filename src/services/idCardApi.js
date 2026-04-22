import { apiClient } from '@/services/apiClient'

const useMockApi =
  import.meta.env.VITE_USE_MOCK_API === 'true' ||
  (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_API !== 'false')
const recognizeEndpoint = import.meta.env.VITE_API_BASE_URL ? 'api/id-card/recognize' : '/api/id-card/recognize'
const confirmEndpoint = import.meta.env.VITE_API_BASE_URL ? 'api/id-card/confirm' : '/api/id-card/confirm'

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function mockRecognizeIdCard() {
  await wait(700)

  return {
    recognizedFields: {
      name: {
        value: '王小明',
        confidence: 0.95,
        needsReview: false,
      },
      nationalId: {
        value: 'A123456789',
        confidence: 0.92,
        needsReview: false,
      },
      birthDate: {
        value: '1990-01-01',
        displayValue: '79年1月1日',
        confidence: 0.84,
        needsReview: true,
      },
      issueDate: {
        value: '2020-05-20',
        displayValue: '109年5月20日',
        confidence: 0.81,
        needsReview: true,
      },
      issueLocation: {
        value: '臺北市',
        confidence: 0.88,
        needsReview: false,
      },
    },
    warnings: ['部分欄位需要確認'],
  }
}

async function mockConfirmIdCard() {
  await wait(500)

  return {
    success: true,
  }
}

export async function recognizeIdCard(payload) {
  if (useMockApi) {
    return mockRecognizeIdCard(payload)
  }

  return apiClient.post(recognizeEndpoint, { json: payload }).json()
}

export async function confirmIdCard(payload) {
  if (useMockApi) {
    return mockConfirmIdCard(payload)
  }

  return apiClient.post(confirmEndpoint, { json: payload }).json()
}
