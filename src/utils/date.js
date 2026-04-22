export function toMinguoDisplay(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  const year = date.getFullYear() - 1911
  const month = date.getMonth() + 1
  const day = date.getDate()

  return `${year}年${month}月${day}日`
}

export function normalizeDateInput(value) {
  const source = String(value || '').trim()

  if (!source) {
    return ''
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) {
    return source
  }

  const minguoMatch = source.match(/^(\d{2,3})[./年-](\d{1,2})[./月-](\d{1,2})日?$/)
  if (!minguoMatch) {
    return source
  }

  const year = Number(minguoMatch[1]) + 1911
  const month = minguoMatch[2].padStart(2, '0')
  const day = minguoMatch[3].padStart(2, '0')

  return `${year}-${month}-${day}`
}
