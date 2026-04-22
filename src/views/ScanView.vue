<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useIdCardStore } from '@/stores/idCardStore'
import { analyzeImageQuality } from '@/utils/imageQuality'

const router = useRouter()
const idCardStore = useIdCardStore()
const scannerRef = ref(null)
const frameRef = ref(null)
const videoRef = ref(null)
const stream = ref(null)
const cameraError = ref('')
const isStartingCamera = ref(false)

const hasCamera = computed(() => Boolean(stream.value))
const targetRatio = 1.586

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function stopCamera() {
  if (stream.value) {
    stream.value.getTracks().forEach((track) => track.stop())
    stream.value = null
  }
}

async function startCamera() {
  stopCamera()
  cameraError.value = ''
  isStartingCamera.value = true

  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError.value = '此瀏覽器不支援相機功能，請改用其他瀏覽器'
    isStartingCamera.value = false
    return
  }

  try {
    stream.value = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    })

    if (videoRef.value) {
      videoRef.value.srcObject = stream.value
      await videoRef.value.play()
    }
  } catch {
    cameraError.value = '無法啟用相機，請確認瀏覽器權限後再試一次'
  } finally {
    isStartingCamera.value = false
  }
}

function getFrameCrop(video, frame) {
  const videoRect = video.getBoundingClientRect()
  const frameRect = frame.getBoundingClientRect()
  const renderedScale = Math.max(videoRect.width / video.videoWidth, videoRect.height / video.videoHeight)
  const renderedWidth = video.videoWidth * renderedScale
  const renderedHeight = video.videoHeight * renderedScale
  const renderedOffsetX = (renderedWidth - videoRect.width) / 2
  const renderedOffsetY = (renderedHeight - videoRect.height) / 2

  let sourceX = (frameRect.left - videoRect.left + renderedOffsetX) / renderedScale
  let sourceY = (frameRect.top - videoRect.top + renderedOffsetY) / renderedScale
  let sourceWidth = frameRect.width / renderedScale
  let sourceHeight = frameRect.height / renderedScale

  sourceX = clamp(sourceX, 0, video.videoWidth - 1)
  sourceY = clamp(sourceY, 0, video.videoHeight - 1)
  sourceWidth = clamp(sourceWidth, 1, video.videoWidth - sourceX)
  sourceHeight = clamp(sourceHeight, 1, video.videoHeight - sourceY)

  return {
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
  }
}

function captureImage() {
  const video = videoRef.value
  const frame = frameRef.value

  if (!video || !frame || !video.videoWidth || !video.videoHeight) {
    cameraError.value = '相機尚未準備完成，請稍後再拍攝'
    return
  }

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })
  const { sourceX, sourceY, sourceWidth, sourceHeight } = getFrameCrop(video, frame)

  canvas.width = 1280
  canvas.height = Math.round(1280 / targetRatio)
  context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height)

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const qualityWarnings = analyzeImageQuality(imageData)
  const image = canvas.toDataURL('image/jpeg', 0.86)

  idCardStore.setCapturedImage(image, qualityWarnings)
  stopCamera()
  router.push({ name: 'preview' })
}

onMounted(() => {
  idCardStore.resetFlow()
  startCamera()
})

onBeforeUnmount(() => {
  stopCamera()
})
</script>

<template>
  <main class="app-shell scan-view">
    <section class="page-panel page-panel--scan" aria-labelledby="scan-title">
      <div class="page-heading">
        <p class="eyebrow">身分證正面</p>
        <h1 id="scan-title">對齊框線後拍攝</h1>
      </div>

      <div ref="scannerRef" class="scanner">
        <video
          ref="videoRef"
          class="scanner__video"
          autoplay
          playsinline
          muted
          aria-label="相機預覽"
        />
        <div class="scanner__overlay" aria-hidden="true">
          <div ref="frameRef" class="scanner__frame">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
        <div v-if="cameraError" class="scanner__fallback" role="alert">
          {{ cameraError }}
        </div>
        <div v-else-if="isStartingCamera" class="scanner__fallback">
          正在啟用相機
        </div>
      </div>

      <div class="action-bar">
        <button class="button button--secondary" type="button" :disabled="isStartingCamera" @click="startCamera">
          重新啟用
        </button>
        <button class="button button--primary" type="button" :disabled="!hasCamera" @click="captureImage">
          拍攝
        </button>
      </div>
    </section>
  </main>
</template>
