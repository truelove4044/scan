export function analyzeImageQuality(imageData) {
  const { data, width, height } = imageData
  const warnings = []
  let luminanceTotal = 0
  let edgeTotal = 0
  let sampleCount = 0

  for (let y = 1; y < height - 1; y += 4) {
    for (let x = 1; x < width - 1; x += 4) {
      const index = (y * width + x) * 4
      const leftIndex = (y * width + x - 1) * 4
      const rightIndex = (y * width + x + 1) * 4

      const luminance = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114
      const left = data[leftIndex] * 0.299 + data[leftIndex + 1] * 0.587 + data[leftIndex + 2] * 0.114
      const right = data[rightIndex] * 0.299 + data[rightIndex + 1] * 0.587 + data[rightIndex + 2] * 0.114

      luminanceTotal += luminance
      edgeTotal += Math.abs(left - right)
      sampleCount += 1
    }
  }

  const averageLuminance = luminanceTotal / sampleCount
  const averageEdge = edgeTotal / sampleCount

  if (averageLuminance < 70) {
    warnings.push('光線偏暗，建議移到明亮處重新拍攝')
  }

  if (averageEdge < 5) {
    warnings.push('影像可能偏模糊，請確認文字清楚可讀')
  }

  return warnings
}
