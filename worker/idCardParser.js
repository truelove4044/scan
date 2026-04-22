const FIELD_KEYS = ['name', 'nationalId', 'birthDate', 'issueDate', 'issueLocation']

const LETTER_CODES = {
  A: 10,
  B: 11,
  C: 12,
  D: 13,
  E: 14,
  F: 15,
  G: 16,
  H: 17,
  I: 34,
  J: 18,
  K: 19,
  L: 20,
  M: 21,
  N: 22,
  O: 35,
  P: 23,
  Q: 24,
  R: 25,
  S: 26,
  T: 27,
  U: 28,
  V: 29,
  W: 32,
  X: 30,
  Y: 31,
  Z: 33,
}

function createField(value = '', confidence = 0, needsReview = true, displayValue = '') {
  return {
    value,
    displayValue,
    confidence,
    needsReview,
  }
}

function createEmptyFields() {
  return FIELD_KEYS.reduce((fields, key) => {
    fields[key] = createField()
    return fields
  }, {})
}

function normalizeText(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/[：﹕]/g, ':')
    .replace(/[Ｏｏ]/g, 'O')
    .replace(/[Ｉｉ]/g, 'I')
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - (char.charCodeAt(0) > 0xff00 ? 0xfee0 : 0)),
    )
}

function validateTaiwanId(value) {
  const normalizedValue = String(value || '').trim().toUpperCase()

  if (!/^[A-Z][0-9]{9}$/.test(normalizedValue) || !['1', '2'].includes(normalizedValue[1])) {
    return false
  }

  const code = LETTER_CODES[normalizedValue[0]]
  const digits = [
    Math.floor(code / 10),
    code % 10,
    ...normalizedValue.slice(1).split('').map(Number),
  ]
  const weights = [1, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1]
  const sum = digits.reduce((total, digit, index) => total + digit * weights[index], 0)

  return sum % 10 === 0
}

function extractNationalId(text) {
  const matches = normalizeText(text).match(/[A-Z][12][0-9]{8}/g) || []
  const validMatch = matches.find(validateTaiwanId)

  return validMatch || matches[0] || ''
}

function toDateValue(year, month, day) {
  const westernYear = Number(year) < 1911 ? Number(year) + 1911 : Number(year)
  const date = new Date(Date.UTC(westernYear, Number(month) - 1, Number(day)))

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== westernYear ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return ''
  }

  return `${westernYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function toMinguoDisplay(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return `${date.getFullYear() - 1911}年${date.getMonth() + 1}月${date.getDate()}日`
}

function extractDateAfterLabel(text, labels) {
  const normalizedText = normalizeText(text)

  for (const label of labels) {
    const labelIndex = normalizedText.indexOf(label)

    if (labelIndex === -1) {
      continue
    }

    const tail = normalizedText.slice(labelIndex, labelIndex + 80)
    const match = tail.match(/(\d{2,4})\s*[年./-]\s*(\d{1,2})\s*[月./-]\s*(\d{1,2})/)

    if (match) {
      return toDateValue(match[1], match[2], match[3])
    }
  }

  return ''
}

function extractName(lines) {
  const labelIndex = lines.findIndex((line) => /姓名/.test(line))

  if (labelIndex !== -1) {
    const labeledValue = lines[labelIndex]
      .replace(/.*姓名\s*:?\s*/, '')
      .replace(/[^\u4e00-\u9fff·．]/g, '')

    if (labeledValue.length >= 2 && labeledValue.length <= 6) {
      return labeledValue
    }

    const nextLine = lines[labelIndex + 1]?.replace(/[^\u4e00-\u9fff·．]/g, '') || ''
    if (nextLine.length >= 2 && nextLine.length <= 6) {
      return nextLine
    }
  }

  return lines
    .map((line) => line.replace(/[^\u4e00-\u9fff·．]/g, ''))
    .find((line) => line.length >= 2 && line.length <= 4 && !/(國民|身分|出生|發證|統一|證號)/.test(line)) || ''
}

function extractIssueLocation(lines) {
  const labelIndex = lines.findIndex((line) => /發證/.test(line) && /(地點|機關|縣|市)/.test(line))

  if (labelIndex !== -1) {
    const value = lines[labelIndex]
      .replace(/.*發證(地點|機關)?\s*:?\s*/, '')
      .match(/[\u4e00-\u9fff]{2,4}(市|縣|區|鄉|鎮)?/)?.[0]

    if (value) {
      return value
    }
  }

  return lines.join(' ').match(/[\u4e00-\u9fff]{2,3}(市|縣)/)?.[0] || ''
}

function getBaseConfidence(visionResponse) {
  const pages = visionResponse?.fullTextAnnotation?.pages || []
  const pageConfidences = pages
    .map((page) => page.confidence)
    .filter((confidence) => typeof confidence === 'number')

  if (!pageConfidences.length) {
    return 0.5
  }

  return pageConfidences.reduce((total, confidence) => total + confidence, 0) / pageConfidences.length
}

export function parseIdCardText(text, visionResponse = {}) {
  const normalizedText = normalizeText(text)
  const lines = normalizedText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const fields = createEmptyFields()
  const baseConfidence = getBaseConfidence(visionResponse)
  const nationalId = extractNationalId(normalizedText)
  const birthDate = extractDateAfterLabel(normalizedText, ['出生', '出生日期', '出生年月日'])
  const issueDate = extractDateAfterLabel(normalizedText, ['發證日期', '發證'])
  const name = extractName(lines)
  const issueLocation = extractIssueLocation(lines)

  fields.name = createField(name, name ? Math.max(baseConfidence, 0.72) : 0.2, !name)
  fields.nationalId = createField(
    nationalId,
    validateTaiwanId(nationalId) ? Math.max(baseConfidence, 0.86) : 0.45,
    !validateTaiwanId(nationalId),
  )
  fields.birthDate = createField(
    birthDate,
    birthDate ? Math.max(baseConfidence, 0.72) : 0.2,
    !birthDate,
    toMinguoDisplay(birthDate),
  )
  fields.issueDate = createField(
    issueDate,
    issueDate ? Math.max(baseConfidence, 0.68) : 0.2,
    true,
    toMinguoDisplay(issueDate),
  )
  fields.issueLocation = createField(issueLocation, issueLocation ? Math.max(baseConfidence, 0.68) : 0.2, true)

  return {
    recognizedFields: fields,
    warnings: FIELD_KEYS.filter((key) => fields[key].needsReview).length ? ['部分欄位需要確認'] : [],
  }
}
