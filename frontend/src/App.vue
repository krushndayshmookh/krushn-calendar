<script setup>
import { ref, onMounted } from 'vue'
import CalendarView from '@/views/CalendarView.vue'
import api from '@/api'

const isAuthenticated = ref(false)
const user = ref(null)
const loading = ref(true)

const checkAuth = async () => {
  try {
    const res = await api.get('/auth/me')
    if (res.data) {
      user.value = res.data
      isAuthenticated.value = true
    }
  } catch (e) {
    isAuthenticated.value = false
  } finally {
    loading.value = false
  }
}

const loginWithGoogle = () => {
    window.location.href = '/api/auth/google'
}

const logout = async () => {
    window.location.href = '/api/auth/logout'
}

onMounted(() => {
  checkAuth()
})
</script>

<template>
  <div class="min-h-screen bg-background text-foreground font-sans antialiased p-8 flex flex-col items-center">
    <div v-if="loading" class="flex items-center justify-center h-full">
        Loading...
    </div>
    
    <div v-else-if="!isAuthenticated" class="max-w-md w-full space-y-6 text-center mt-20">
      <h1 class="text-4xl font-bold tracking-tight">Krushn Calendar</h1>
      <p class="text-gray-500">Sign in to manage your schedule</p>
      
      <button 
        @click="loginWithGoogle"
        class="w-full flex items-center justify-center gap-3 bg-white text-gray-700 border border-gray-300 px-4 py-3 rounded shadow hover:bg-gray-50 transition-colors font-medium"
      >
        <img src="https://www.svgrepo.com/show/475656/google-color.svg" class="w-6 h-6" alt="Google" />
        Sign in with Google
      </button>
    </div>

    <div v-else class="w-full">
      <header class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">My Calendar</h1>
        <div class="flex items-center gap-4">
             <span class="text-sm text-gray-600">{{ user?.displayName }}</span>
             <button @click="logout" class="text-sm underline">
                Logout
            </button>
        </div>
      </header>
      <main>
        <CalendarView />
      </main>
    </div>
  </div>
</template>
