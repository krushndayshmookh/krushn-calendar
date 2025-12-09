<script setup>
import { ref, watch, computed } from 'vue'
import Dialog from './ui/Dialog.vue'
import Button from './ui/Button.vue'
import Input from './ui/Input.vue'
import { format } from 'date-fns'
import api from '@/api'

const props = defineProps({
  open: Boolean,
  event: Object, // null for create
  initialDate: Date, // fallback for create
  categories: Array
})

const emit = defineEmits(['update:open', 'save', 'delete'])

const formData = ref({
  summary: '',
  description: '',
  start: '',
  end: '',
  location: '',
  tags: '',
  notes: '',
  categoryId: ''
})

const isEdit = computed(() => !!props.event?.id)

// Initialize form when opening
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    if (props.event && props.event.id) {
      // Edit mode
      formData.value = {
        summary: props.event.summary || '',
        description: props.event.description || '',
        start: props.event.start?.dateTime ? format(new Date(props.event.start.dateTime), "yyyy-MM-dd'T'HH:mm") : '',
        end: props.event.end?.dateTime ? format(new Date(props.event.end.dateTime), "yyyy-MM-dd'T'HH:mm") : '',
        location: props.event.location || '',
        tags: props.event.extendedProps?.tags?.join(', ') || '',
        notes: props.event.extendedProps?.notes || '',
        categoryId: props.event.extendedProps?.category?._id || '',
      }
    } else {
      // Create mode
      const startDate = props.initialDate || new Date()
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)
      formData.value = {
        summary: '',
        description: '',
        start: format(startDate, "yyyy-MM-dd'T'HH:mm"),
        end: format(endDate, "yyyy-MM-dd'T'HH:mm"),
        location: '',
        tags: '',
        notes: '',
        categoryId: '',
      }
    }
  }
})

const selfAttendee = computed(() => {
    return props.event?.attendees?.find(a => a.self)
})

const handleRSVP = async (status) => {
    try {
        await api.post(`/events/${props.event.id}/rsvp`, { responseStatus: status })
        // Optimistic update or emit refresh
        emit('save', { refreshOnly: true }) // Hack to trigger reload
        // Or just close
        emit('update:open', false)
    } catch (e) {
        console.error(e)
        alert('Failed to update RSVP')
    }
}

const handleSubmit = () => {
  const payload = {
    ...formData.value,
    tags: formData.value.tags.split(',').map(t => t.trim()).filter(Boolean)
  }
  
  // Format dates to ISO
  if (payload.start) payload.start = { dateTime: new Date(payload.start).toISOString() }
  if (payload.end) payload.end = { dateTime: new Date(payload.end).toISOString() }

  emit('save', payload)
}
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <template #title>{{ isEdit ? 'Edit Event' : 'New Event' }}</template>
    
    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-4 items-center gap-4">
        <label class="text-right text-sm">Title</label>
        <Input v-model="formData.summary" class="col-span-3" />
      </div>
      <div class="grid grid-cols-4 items-center gap-4">
        <label class="text-right text-sm">Start</label>
        <Input type="datetime-local" v-model="formData.start" class="col-span-3" />
      </div>
      <div class="grid grid-cols-4 items-center gap-4">
        <label class="text-right text-sm">End</label>
        <Input type="datetime-local" v-model="formData.end" class="col-span-3" />
      </div>
      <div class="grid grid-cols-4 items-center gap-4">
        <label class="text-right text-sm">Location</label>
        <Input v-model="formData.location" class="col-span-3" />
      </div>

      <!-- Organizer Details -->
      <div v-if="event?.organizer" class="grid grid-cols-4 items-start gap-4 my-1">
        <label class="text-right text-sm text-gray-500 pt-1">Organizer</label>
        <div class="col-span-3 text-sm flex flex-col">
           <span>{{ event.organizer.email }}</span>
        </div>
      </div>

      <!-- Attendees Details -->
      <div v-if="event?.attendees?.length" class="grid grid-cols-4 items-start gap-4 my-1">
        <label class="text-right text-sm text-gray-500 pt-1">Guests</label>
        <div class="col-span-3 text-sm space-y-1 max-h-[100px] overflow-y-auto">
            <div v-for="att in event.attendees" :key="att.email" class="flex flex-col">
                 <div class="flex items-center gap-2">
                    <span>{{ att.email }}</span>
                    <span v-if="att.responseStatus === 'accepted'" class="text-green-600 text-[10px] bg-green-50 px-1 rounded">Going</span>
                    <span v-if="att.responseStatus === 'declined'" class="text-red-600 text-[10px] bg-red-50 px-1 rounded">No</span>
                    <span v-if="att.responseStatus === 'tentative'" class="text-yellow-600 text-[10px] bg-yellow-50 px-1 rounded">Maybe</span>
                    <span v-if="att.responseStatus === 'needsAction'" class="text-gray-500 text-[10px] bg-gray-50 px-1 rounded">?</span>
                 </div>
            </div>
        </div>
      </div>

      <!-- RSVP Actions -->
      <div v-if="selfAttendee" class="grid grid-cols-4 items-center gap-4 my-2 p-2 bg-gray-50 rounded">
        <label class="text-right text-sm font-medium">Going?</label>
        <div class="col-span-3 flex gap-2">
            <button 
                @click="handleRSVP('accepted')" 
                class="px-3 py-1 rounded text-xs border transition-colors"
                :class="selfAttendee.responseStatus === 'accepted' ? 'bg-green-100 border-green-300 text-green-800 font-bold' : 'hover:bg-gray-100'"
            >Yes</button>
            <button 
                @click="handleRSVP('declined')" 
                class="px-3 py-1 rounded text-xs border transition-colors"
                :class="selfAttendee.responseStatus === 'declined' ? 'bg-red-100 border-red-300 text-red-800 font-bold' : 'hover:bg-gray-100'"
            >No</button>
            <button 
                @click="handleRSVP('tentative')" 
                class="px-3 py-1 rounded text-xs border transition-colors"
                :class="selfAttendee.responseStatus === 'tentative' ? 'bg-yellow-100 border-yellow-300 text-yellow-800 font-bold' : 'hover:bg-gray-100'"
            >Suggest Time</button>
        </div>
      </div>

      <div class="grid grid-cols-4 items-center gap-4">
        <label class="text-right text-sm">Category</label>
        <select v-model="formData.categoryId" class="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
          <option value="">No Category</option>
          <option v-for="cat in categories" :key="cat._id" :value="cat._id">
            {{ cat.name }}
          </option>
        </select>
      </div>
      <div class="grid grid-cols-4 items-center gap-4">
        <label class="text-right text-sm">Tags</label>
        <Input v-model="formData.tags" placeholder="Comma separated" class="col-span-3" />
      </div>
      <div class="grid grid-cols-4 items-center gap-4">
        <label class="text-right text-sm">Notes</label>
        <textarea 
          v-model="formData.notes" 
          class="col-span-3 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        ></textarea>
      </div>
    </div>

    <div class="flex justify-end gap-2">
      <a 
        v-if="event?.hangoutLink" 
        :href="event.hangoutLink" 
        target="_blank"
        class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 mr-auto"
      >
        Join Meeting
      </a>
      <Button v-if="isEdit" variant="destructive" @click="$emit('delete')">Delete</Button>
      <Button variant="outline" @click="$emit('update:open', false)">Cancel</Button>
      <Button @click="handleSubmit">Save</Button>
    </div>
  </Dialog>
</template>
