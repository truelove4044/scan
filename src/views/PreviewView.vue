<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { useIdCardStore } from '@/stores/idCardStore'

const router = useRouter()
const idCardStore = useIdCardStore()

onMounted(() => {
  if (!idCardStore.hasCapturedImage) {
    router.replace({ name: 'scan' })
  }
})

async function recognize() {
  const success = await idCardStore.recognize()

  if (success) {
    router.push({ name: 'confirm' })
  }
}

function retake() {
  idCardStore.clearCapture()
  router.push({ name: 'scan' })
}
</script>

<template>
  <main class="app-shell">
    <section class="page-panel" aria-labelledby="preview-title">
      <div class="page-heading">
        <p class="eyebrow">拍攝預覽</p>
        <h1 id="preview-title">確認文字清楚可讀</h1>
      </div>

      <div class="preview-frame">
        <img :src="idCardStore.capturedImage" alt="已拍攝的身分證正面" />
      </div>

      <div v-if="idCardStore.qualityWarnings.length" class="notice notice--warning" role="status">
        <p v-for="warning in idCardStore.qualityWarnings" :key="warning">{{ warning }}</p>
      </div>

      <div v-if="idCardStore.errorMessage" class="notice notice--danger" role="alert">
        {{ idCardStore.errorMessage }}
      </div>

      <div class="action-bar">
        <button class="button button--secondary" type="button" :disabled="idCardStore.isRecognizing" @click="retake">
          重拍
        </button>
        <button class="button button--primary" type="button" :disabled="idCardStore.isRecognizing" @click="recognize">
          {{ idCardStore.isRecognizing ? '辨識中' : '送出辨識' }}
        </button>
      </div>
    </section>
  </main>
</template>
