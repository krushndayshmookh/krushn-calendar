<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, parseISO, addDays } from 'date-fns'
import api from '@/api'
import EventModal from '@/components/EventModal.vue'
import CategoryManager from '@/components/CategoryManager.vue'
import WeekView from '@/views/WeekView.vue'
import Button from '@/components/ui/Button.vue'

const viewMode = ref('month') // 'month' | 'week'
const currentDate = ref(new Date())
const events = ref([])
const categories = ref([])
const activeCategories = ref(JSON.parse(localStorage.getItem('calendar_active_categories') || '[]'))
// const days = ref([]) // REFACTOR: Now computed
const slotHeight = ref(48)
const showDeclined = ref(JSON.parse(localStorage.getItem('calendar_show_declined') || 'false'))

const isModalOpen = ref(false)
const isCategoryManagerOpen = ref(false)
const selectedEvent = ref(null)
const selectedDate = ref(null)
const loading = ref(false)

const loadEvents = async () => {
    loading.value = true
    try {
        const start = startOfMonth(currentDate.value)
        const end = endOfMonth(currentDate.value)
        // Fetch slightly wider range (start of first week to end of last week)
        const timeMin = startOfWeek(start).toISOString()
        const timeMax = endOfWeek(end).toISOString()
        
        const response = await api.get('/events', {
            params: {
                timeMin,
                timeMax
            }
        })
        events.value = response.data
    } catch (e) {
        console.error(e)
        alert('Failed to load events')
    } finally {
        loading.value = false
    }
}

const loadCategories = async () => {
    try {
        const res = await api.get('/categories')
        categories.value = res.data
        
        // If no saved state (and empty), enable all by default
        if (activeCategories.value.length === 0 && !localStorage.getItem('calendar_active_categories')) {
            activeCategories.value = categories.value.map(c => c._id)
        }
    } catch (e) {
        console.error('Failed to load categories')
    }
}

// Persistence Watchers
watch(activeCategories, (newVal) => {
    localStorage.setItem('calendar_active_categories', JSON.stringify(newVal))
}, { deep: true })

watch(showDeclined, (newVal) => {
    localStorage.setItem('calendar_show_declined', JSON.stringify(newVal))
})

// Filtered events
const filteredEvents = computed(() => {
    // If we have categories loaded but none selected, show only uncategorized?
    // User expectation: Uncheck "Work" -> Hide Work. Uncheck All -> Hide All Categorized.
    
    return events.value.filter(e => {
        // 1. Filter Check: Declined Events
        const selfAttendee = e.attendees?.find(a => a.self)
        const isDeclined = selfAttendee?.responseStatus === 'declined'
        if (isDeclined && !showDeclined.value) return false

        // 2. Filter Check: Categories
        const catId = e.extendedProps?.category?._id
        
        // Always show uncategorized events for now (or could add a filter for them)
        if (!catId) return true 
        
        return activeCategories.value.includes(catId)
    })
})

const days = computed(() => {
    const start = startOfWeek(startOfMonth(currentDate.value))
    const end = endOfWeek(endOfMonth(currentDate.value))
    
    return eachDayOfInterval({ start, end }).map(date => {
        // Find events for this day
        const dayEvents = filteredEvents.value.filter(e => {
            if (!e.start.dateTime) return false // All day events TODO
            const eventDate = parseISO(e.start.dateTime)
            return format(eventDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        })

        return {
            date,
            isCurrentMonth: isSameMonth(date, currentDate.value),
            isToday: isToday(date),
            events: dayEvents
        }
    })
})

const nextMonth = () => {
    if (viewMode.value === 'month') {
        currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1)
    } else {
        currentDate.value = addDays(currentDate.value, 7)
    }
    loadEvents()
}

const prevMonth = () => {
    if (viewMode.value === 'month') {
        currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1)
    } else {
         currentDate.value = addDays(currentDate.value, -7)
    }
    loadEvents()
}

const handleDateClick = (date) => {
    selectedDate.value = date
    selectedEvent.value = null
    isModalOpen.value = true
}

const handleEventClick = (event, e) => {
    e.stopPropagation()
    selectedEvent.value = event
    isModalOpen.value = true
}

const handleSave = async (payload) => {
    try {
        if (selectedEvent.value) {
            await api.put(`/events/${selectedEvent.value.id}`, payload)
        } else {
            await api.post('/events', payload)
        }
        isModalOpen.value = false
        loadEvents()
    } catch (e) {
        console.error(e)
        alert('Failed to save')
    }
}

const handleDelete = async () => {
    if (!confirm('Are you sure?')) return
    try {
        await api.delete(`/events/${selectedEvent.value.id}`)
        isModalOpen.value = false
        loadEvents()
    } catch (e) {
        console.error(e)
        alert('Failed to delete')
    }
}

onMounted(() => {
    loadCategories()
    loadEvents()
})

const getEventColor = (event) => {
    return event.extendedProps?.category?.color || '#3b82f6' // default blue
}

const isEventDeclined = (event) => {
    return event.attendees?.find(a => a.self)?.responseStatus === 'declined'
}
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="flex justify-between items-center mb-4 px-4">
      <div class="flex items-center gap-4">
        <h2 class="text-2xl font-bold">{{ format(currentDate, 'MMMM yyyy') }}</h2>
        <div class="flex bg-gray-100 rounded-md p-1 gap-1">
            <button @click="viewMode = 'month'" :class="viewMode === 'month' ? 'bg-white shadow' : ''" class="px-3 py-1 rounded text-sm transition-all">Month</button>
            <button @click="viewMode = 'week'" :class="viewMode === 'week' ? 'bg-white shadow' : ''" class="px-3 py-1 rounded text-sm transition-all">Week</button>
        </div>
        
        <!-- Zoom Slider (Week View Only) -->
        <div v-if="viewMode === 'week'" class="flex items-center gap-2 ml-4">
            <span class="text-xs text-gray-500">Zoom</span>
            <input type="range" min="30" max="100" v-model.number="slotHeight" class="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer">
        </div>
      </div>

      <div class="flex items-center gap-2">
         <!-- Filter Dropdown (Simplified as a list for now) -->
         <div class="flex items-center gap-4 mr-4">
             <!-- Toggle Declined -->
             <label class="flex items-center gap-1 text-xs cursor-pointer select-none text-gray-600">
                 <input type="checkbox" v-model="showDeclined" class="rounded text-gray-600 focus:ring-gray-500" />
                 Show Declined
             </label>

             <div class="h-4 w-px bg-gray-300"></div>

             <label v-for="cat in categories" :key="cat._id" class="flex items-center gap-1 text-xs cursor-pointer select-none">
                 <input type="checkbox" :value="cat._id" v-model="activeCategories" class="rounded text-blue-600 focus:ring-blue-500" />
                 <span class="w-3 h-3 rounded-full" :style="{ backgroundColor: cat.color }"></span>
                 {{ cat.name }}
             </label>
         </div>

        <Button variant="outline" @click="isCategoryManagerOpen = true">Categories</Button>
        <div class="space-x-2">
            <Button variant="outline" @click="prevMonth">&lt; Prev</Button>
            <Button variant="outline" @click="nextMonth">Next &gt;</Button>
        </div>
      </div>
    </div>

    <!-- Month View -->
    <div v-if="viewMode === 'month'" class="grid grid-cols-7 gap-1 border border-gray-200 bg-gray-200 flex-1">
      <div v-for="dayName in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="dayName" class="bg-white p-2 text-center font-semibold text-sm">
        {{ dayName }}
      </div>
      
      <div 
        v-for="day in days" 
        :key="day.date.toString()"
        @click="handleDateClick(day.date)"
        class="bg-white min-h-[120px] p-2 cursor-pointer hover:bg-gray-50 transition-colors"
        :class="{ 'opacity-50': !day.isCurrentMonth, 'bg-blue-50': day.isToday }"
      >
        <div class="text-right text-sm mb-1" :class="{ 'text-blue-600 font-bold': day.isToday }">
          {{ format(day.date, 'd') }}
        </div>
        <div class="space-y-1">
            <div 
                v-for="event in day.events" 
                :key="event.id" 
                @click="(e) => handleEventClick(event, e)"
                class="text-xs p-1 rounded text-white truncate hover:brightness-90 transition-all"
                :class="{ 'opacity-50 line-through decoration-white': isEventDeclined(event) }"
                :style="{ backgroundColor: getEventColor(event) }"
            >
                {{ event.summary }}
            </div>
        </div>
      </div>
    </div>

    <!-- Week View -->
    <WeekView 
        v-else 
        :events="filteredEvents" 
        :current-date="currentDate" 
        :categories="categories"
        :slot-height="slotHeight"
        @slot-click="handleDateClick"
        @event-click="(e) => handleEventClick(e, { stopPropagation: () => {} })"
        class="flex-1"
    />

    <EventModal 
        v-model:open="isModalOpen"
        :event="selectedEvent"
        :initial-date="selectedDate"
        :categories="categories"
        @save="handleSave"
        @delete="handleDelete"
    />

    <CategoryManager 
        v-model:open="isCategoryManagerOpen"
        @change="loadCategories"
    />
  </div>
</template>
