import { createRouter, createWebHistory } from 'vue-router'

import ConfirmView from '@/views/ConfirmView.vue'
import DoneView from '@/views/DoneView.vue'
import PreviewView from '@/views/PreviewView.vue'
import ScanView from '@/views/ScanView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'scan',
      component: ScanView,
    },
    {
      path: '/preview',
      name: 'preview',
      component: PreviewView,
    },
    {
      path: '/confirm',
      name: 'confirm',
      component: ConfirmView,
    },
    {
      path: '/done',
      name: 'done',
      component: DoneView,
    },
  ],
})

export default router
