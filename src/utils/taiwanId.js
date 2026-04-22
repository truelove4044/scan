const letterCodes = {
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

export function validateTaiwanId(value) {
  const normalizedValue = String(value || '').trim().toUpperCase()

  if (!normalizedValue) {
    return {
      valid: false,
      message: '請輸入身分證字號',
    }
  }

  if (!/^[A-Z][0-9]{9}$/.test(normalizedValue)) {
    return {
      valid: false,
      message: '請確認身分證字號格式',
    }
  }

  if (!['1', '2'].includes(normalizedValue[1])) {
    return {
      valid: false,
      message: '請確認身分證字號',
    }
  }

  const code = letterCodes[normalizedValue[0]]
  if (!code) {
    return {
      valid: false,
      message: '請確認身分證字號',
    }
  }

  const digits = [
    Math.floor(code / 10),
    code % 10,
    ...normalizedValue.slice(1).split('').map(Number),
  ]
  const weights = [1, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1]
  const sum = digits.reduce((total, digit, index) => total + digit * weights[index], 0)

  if (sum % 10 !== 0) {
    return {
      valid: false,
      message: '請確認身分證字號',
    }
  }

  return {
    valid: true,
    message: '',
  }
}
