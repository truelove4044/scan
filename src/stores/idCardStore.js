import { defineStore } from 'pinia'

import { confirmIdCard, recognizeIdCard } from '@/services/idCardApi'
import { toMinguoDisplay } from '@/utils/date'
import { validateTaiwanId } from '@/utils/taiwanId'

const fieldLabels = {
  name: '姓名',
  nationalId: '身分證字號',
  birthDate: '出生日期',
  issueDate: '發證日期',
  issueLocation: '發證地點',
}

const requiredFields = ['name', 'nationalId']

function createInitialForm() {
  return {
    name: '',
    nationalId: '',
    birthDate: '',
    issueDate: '',
    issueLocation: '',
  }
}

function normalizeRecognizedFields(recognizedFields = {}) {
  return Object.entries(fieldLabels).reduce((fields, [key, label]) => {
    const source = recognizedFields[key] || {}

    fields[key] = {
      label,
      value: source.value || '',
      displayValue: source.displayValue || '',
      confidence: typeof source.confidence === 'number' ? source.confidence : null,
      needsReview: Boolean(source.needsReview),
      error: '',
    }

    return fields
  }, {})
}

export const useIdCardStore = defineStore('idCard', {
  state: () => ({
    capturedImage: '',
    imageMimeType: 'image/jpeg',
    qualityWarnings: [],
    recognizedFields: normalizeRecognizedFields(),
    form: createInitialForm(),
    isRecognizing: false,
    isSubmitting: false,
    errorMessage: '',
    completedAt: '',
  }),

  getters: {
    hasCapturedImage: (state) => Boolean(state.capturedImage),
    hasRecognizedFields: (state) => Object.values(state.recognizedFields).some((field) => field.value),
    fieldList: (state) => Object.entries(state.recognizedFields).map(([key, field]) => ({ key, ...field })),
    canSubmit: (state) => {
      const nationalIdResult = validateTaiwanId(state.form.nationalId)

      return requiredFields.every((field) => state.form[field].trim()) && nationalIdResult.valid
    },
  },

  actions: {
    setCapturedImage(image, qualityWarnings = []) {
      this.capturedImage = image
      this.imageMimeType = 'image/jpeg'
      this.qualityWarnings = qualityWarnings
      this.errorMessage = ''
      this.completedAt = ''
    },

    clearCapture() {
      this.capturedImage = ''
      this.qualityWarnings = []
      this.errorMessage = ''
    },

    resetFlow() {
      this.capturedImage = ''
      this.qualityWarnings = []
      this.recognizedFields = normalizeRecognizedFields()
      this.form = createInitialForm()
      this.isRecognizing = false
      this.isSubmitting = false
      this.errorMessage = ''
      this.completedAt = ''
    },

    applyRecognizedFields(recognizedFields) {
      this.recognizedFields = normalizeRecognizedFields(recognizedFields)
      this.form = Object.keys(fieldLabels).reduce((form, key) => {
        form[key] = this.recognizedFields[key].value || ''
        return form
      }, {})
    },

    validateForm() {
      const nextFields = normalizeRecognizedFields(this.recognizedFields)

      Object.keys(fieldLabels).forEach((key) => {
        nextFields[key].value = this.form[key] || ''
      })

      requiredFields.forEach((key) => {
        if (!this.form[key].trim()) {
          nextFields[key].error = `請確認${fieldLabels[key]}`
          nextFields[key].needsReview = true
        }
      })

      const nationalIdResult = validateTaiwanId(this.form.nationalId)
      if (!nationalIdResult.valid) {
        nextFields.nationalId.error = nationalIdResult.message
        nextFields.nationalId.needsReview = true
      }

      ;['birthDate', 'issueDate'].forEach((key) => {
        if (this.form[key]) {
          nextFields[key].displayValue = toMinguoDisplay(this.form[key])
        }
      })

      this.recognizedFields = nextFields

      return this.canSubmit
    },

    async recognize() {
      if (!this.capturedImage) {
        this.errorMessage = '請先拍攝身分證'
        return false
      }

      this.isRecognizing = true
      this.errorMessage = ''

      try {
        const result = await recognizeIdCard({
          image: this.capturedImage,
          imageMimeType: this.imageMimeType,
        })

        this.applyRecognizedFields(result.recognizedFields)
        this.validateForm()
        return true
      } catch {
        this.errorMessage = '辨識暫時無法完成，請稍後再試或重新拍攝'
        return false
      } finally {
        this.isRecognizing = false
      }
    },

    async submitConfirmed() {
      if (!this.validateForm()) {
        this.errorMessage = '請先修正需要確認的欄位'
        return false
      }

      this.isSubmitting = true
      this.errorMessage = ''

      try {
        await confirmIdCard({ ...this.form })
        this.capturedImage = ''
        this.qualityWarnings = []
        this.completedAt = new Date().toISOString()
        return true
      } catch {
        this.errorMessage = '資料暫時無法送出，請確認後再試一次'
        return false
      } finally {
        this.isSubmitting = false
      }
    },
  },
})
