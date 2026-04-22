import { parseIdCardText } from './idCardParser.js'

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
}

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...JSON_HEADERS,
      ...(init.headers || {}),
    },
  })
}

function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, { status })
}

function normalizeBase64Image(image) {
  return String(image || '').replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')
}

async function readJson(request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}

async function callGoogleVision(image, env) {
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(env.GOOGLE_VISION_API_KEY)}`,
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: normalizeBase64Image(image),
            },
            features: [
              {
                type: 'DOCUMENT_TEXT_DETECTION',
                maxResults: 1,
              },
            ],
          },
        ],
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Google Vision request failed with status ${response.status}`)
  }

  const payload = await response.json()
  const annotation = payload.responses?.[0]

  if (annotation?.error) {
    throw new Error('Google Vision returned an annotation error')
  }

  return annotation || {}
}

async function handleRecognize(request, env) {
  if (!env.GOOGLE_VISION_API_KEY) {
    return errorResponse('辨識服務尚未設定，請稍後再試', 503)
  }

  const body = await readJson(request)

  if (!body?.image) {
    return errorResponse('請提供要辨識的影像', 400)
  }

  try {
    const annotation = await callGoogleVision(body.image, env)
    const text = annotation.fullTextAnnotation?.text || annotation.textAnnotations?.[0]?.description || ''

    if (!text.trim()) {
      return jsonResponse({
        recognizedFields: parseIdCardText('', annotation).recognizedFields,
        warnings: ['無法清楚辨識文字，請重拍或手動確認欄位'],
      })
    }

    return jsonResponse(parseIdCardText(text, annotation))
  } catch {
    return errorResponse('辨識暫時無法完成，請重新拍攝或稍後再試', 502)
  }
}

async function handleConfirm(request) {
  const body = await readJson(request)

  if (!body) {
    return errorResponse('請確認資料後再送出', 400)
  }

  return jsonResponse({ success: true })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204 })
    }

    if (url.pathname === '/api/id-card/recognize' && request.method === 'POST') {
      return handleRecognize(request, env)
    }

    if (url.pathname === '/api/id-card/confirm' && request.method === 'POST') {
      return handleConfirm(request)
    }

    if (url.pathname.startsWith('/api/')) {
      return errorResponse('找不到指定的服務', 404)
    }

    return env.ASSETS.fetch(request)
  },
}
