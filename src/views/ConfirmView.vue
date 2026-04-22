<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useIdCardStore } from '@/stores/idCardStore'
import { normalizeDateInput, toMinguoDisplay } from '@/utils/date'

const router = useRouter()
const idCardStore = useIdCardStore()
const firstInvalidField = ref(null)

const fieldHints = {
  name: '請確認姓名與證件相同',
  nationalId: '格式為英文字母加九位數字',
  birthDate: '可輸入西元日期或民國年月日',
  issueDate: '可輸入西元日期或民國年月日',
  issueLocation: '請依證件顯示地點填寫',
}

const visibleFields = computed(() => idCardStore.fieldList)

onMounted(() => {
  if (!idCardStore.hasRecognizedFields) {
    router.replace(idCardStore.hasCapturedImage ? { name: 'preview' } : { name: 'scan' })
  }
})

function normalizeDateField(key) {
  idCardStore.form[key] = normalizeDateInput(idCardStore.form[key])
  idCardStore.validateForm()
}

function setFirstInvalidField(element, field) {
  if (!element || firstInvalidField.value) {
    return
  }

  if (field.error || field.needsReview) {
    firstInvalidField.value = element
  }
}

async function submit() {
  firstInvalidField.value = null
  const success = await idCardStore.submitConfirmed()

  if (success) {
    router.push({ name: 'done' })
    return
  }

  await nextTick()
  firstInvalidField.value?.focus()
}

function retake() {
  idCardStore.resetFlow()
  router.push({ name: 'scan' })
}
</script>

<template>
  <main class="app-shell">
    <section class="page-panel" aria-labelledby="confirm-title">
      <div class="page-heading">
        <p class="eyebrow">資料確認</p>
        <h1 id="confirm-title">確認辨識結果</h1>
      </div>

      <form class="confirm-form" @submit.prevent="submit">
        <div
          v-for="field in visibleFields"
          :key="field.key"
          class="field"
          :class="{ 'field--review': field.needsReview || field.error }"
        >
          <label class="field__label" :for="field.key">
            {{ field.label }}
          </label>
          <input
            :id="field.key"
            :ref="(el) => setFirstInvalidField(el, field)"
            v-model.trim="idCardStore.form[field.key]"
            class="field__input"
            :inputmode="field.key === 'nationalId' ? 'text' : undefined"
            :autocomplete="field.key === 'name' ? 'name' : 'off'"
            :aria-invalid="Boolean(field.error)"
            :aria-describedby="`${field.key}-hint ${field.key}-status`"
            @blur="field.key === 'birthDate' || field.key === 'issueDate' ? normalizeDateField(field.key) : idCardStore.validateForm()"
          />
          <p :id="`${field.key}-hint`" class="field__hint">
            {{ fieldHints[field.key] }}
          </p>
          <p v-if="field.key === 'birthDate' || field.key === 'issueDate'" class="field__hint">
            顯示為 {{ toMinguoDisplay(idCardStore.form[field.key]) || '尚未填寫' }}
          </p>
          <p v-if="field.error" :id="`${field.key}-status`" class="field__error" role="alert">
            {{ field.error }}
          </p>
          <p v-else-if="field.needsReview" :id="`${field.key}-status`" class="field__review">
            請再次確認此欄位
          </p>
          <p v-else :id="`${field.key}-status`" class="sr-only">
            欄位已通過初步檢查
          </p>
        </div>

        <div v-if="idCardStore.errorMessage" class="notice notice--danger" role="alert">
          {{ idCardStore.errorMessage }}
        </div>

        <div class="action-bar">
          <button class="button button--secondary" type="button" :disabled="idCardStore.isSubmitting" @click="retake">
            重新拍攝
          </button>
          <button class="button button--primary" type="submit" :disabled="idCardStore.isSubmitting">
            {{ idCardStore.isSubmitting ? '送出中' : '確認送出' }}
          </button>
        </div>
      </form>
    </section>
  </main>
</template>
