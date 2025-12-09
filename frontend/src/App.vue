<script setup>
import { ref, onMounted } from 'vue'
import CalendarView from '@/views/CalendarView.vue'

const isAuthenticated = ref(false)
const password = ref('')

onMounted(() => {
  const stored = localStorage.getItem('app_password')
  if (stored) {
    isAuthenticated.value = true
  }
})

const login = () => {
  if (password.value) {
    localStorage.setItem('app_password', password.value)
    isAuthenticated.value = true
  }
}
</script>

<template>
  <div class="min-h-screen bg-background text-foreground font-sans antialiased p-8 flex flex-col items-center">
    <div v-if="!isAuthenticated" class="max-w-md w-full space-y-4 text-center">
      <h1 class="text-2xl font-bold">Krushn Calendar</h1>
      <p class="text-gray-500">Enter App Password to continue</p>
      <input 
        v-model="password" 
        type="password" 
        placeholder="Password"
        class="w-full p-2 border rounded bg-white text-black"
        @keyup.enter="login"
      />
      <button 
        @click="login"
        class="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
      >
        Enter
      </button>
    </div>

    <div v-else class="w-full">
      <header class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">My Calendar</h1>
        <button @click="() => { localStorage.removeItem('app_password'); isAuthenticated = false }" class="text-sm underline">
          Logout
        </button>
      </header>
      <main>
        <CalendarView />
      </main>
    </div>
  </div>
</template>
