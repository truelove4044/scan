<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useIdCardStore } from '@/stores/idCardStore'
import { analyzeImageQuality } from '@/utils/imageQuality'

const router = useRouter()
const idCardStore = useIdCardStore()
const videoRef = ref(null)
const stream = ref(null)
const cameraError = ref('')
const isStartingCamera = ref(false)

const hasCamera = computed(() => Boolean(stream.value))

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

function captureImage() {
  const video = videoRef.value

  if (!video || !video.videoWidth || !video.videoHeight) {
    cameraError.value = '相機尚未準備完成，請稍後再拍攝'
    return
  }

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })
  const sourceRatio = video.videoWidth / video.videoHeight
  const targetRatio = 1.586

  let sourceWidth = video.videoWidth
  let sourceHeight = video.videoHeight
  let sourceX = 0
  let sourceY = 0

  if (sourceRatio > targetRatio) {
    sourceWidth = video.videoHeight * targetRatio
    sourceX = (video.videoWidth - sourceWidth) / 2
  } else {
    sourceHeight = video.videoWidth / targetRatio
    sourceY = (video.videoHeight - sourceHeight) / 2
  }

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

      <div class="scanner">
        <video
          ref="videoRef"
          class="scanner__video"
          autoplay
          playsinline
          muted
          aria-label="相機預覽"
        />
        <div class="scanner__overlay" aria-hidden="true">
          <div class="scanner__frame">
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
