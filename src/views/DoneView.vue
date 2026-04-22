<script setup>
import { useRouter } from 'vue-router'

import { useIdCardStore } from '@/stores/idCardStore'

const router = useRouter()
const idCardStore = useIdCardStore()

function restart() {
  idCardStore.resetFlow()
  router.push({ name: 'scan' })
}
</script>

<template>
  <main class="app-shell">
    <section class="page-panel page-panel--center" aria-labelledby="done-title">
      <div class="status-mark" aria-hidden="true" />
      <div class="page-heading">
        <p class="eyebrow">完成</p>
        <h1 id="done-title">資料已送出</h1>
      </div>
      <button class="button button--primary button--wide" type="button" @click="restart">
        重新掃描
      </button>
    </section>
  </main>
</template>
