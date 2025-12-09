<script setup>
import { ref, onMounted } from 'vue'
import Dialog from './ui/Dialog.vue'
import Button from './ui/Button.vue'
import Input from './ui/Input.vue'
import api from '@/api'
import { X } from 'lucide-vue-next'

const props = defineProps({
  open: Boolean,
})
const emit = defineEmits(['update:open', 'change'])

const categories = ref([])
const newCategoryName = ref('')
const newCategoryColor = ref('#3b82f6')

const loadCategories = async () => {
    try {
        const res = await api.get('/categories')
        categories.value = res.data
        emit('change') // Notify parent to reload events if categories changed
    } catch (e) {
        console.error(e)
    }
}

const addCategory = async () => {
    if (!newCategoryName.value) return
    try {
        const res = await api.post('/categories', {
            name: newCategoryName.value,
            color: newCategoryColor.value
        })
        categories.value.push(res.data)
        newCategoryName.value = ''
        emit('change')
    } catch (e) {
        alert('Failed to add category')
    }
}

const deleteCategory = async (id) => {
    if (!confirm('Delete category?')) return
    try {
        await api.delete(`/categories/${id}`)
        categories.value = categories.value.filter(c => c._id !== id)
        emit('change')
    } catch (e) {
        alert('Failed to delete')
    }
}

onMounted(() => {
    loadCategories()
})
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <template #title>Manage Categories</template>
    
    <div class="py-4 space-y-4">
        <!-- Add New -->
        <div class="flex gap-2 items-end border-b pb-4">
            <div class="flex-1">
                <label class="text-xs">Name</label>
                <Input v-model="newCategoryName" placeholder="e.g. Work" />
            </div>
            <div>
                <label class="text-xs">Color</label>
                <input type="color" v-model="newCategoryColor" class="h-10 w-12 block border rounded cursor-pointer" />
            </div>
            <Button @click="addCategory">Add</Button>
        </div>

        <!-- List -->
        <div class="space-y-2 max-h-[300px] overflow-y-auto">
            <div v-for="cat in categories" :key="cat._id" class="flex items-center justify-between p-2 hover:bg-gray-50 rounded border">
                <div class="flex items-center gap-2">
                    <span class="w-4 h-4 rounded-full" :style="{ backgroundColor: cat.color }"></span>
                    <span>{{ cat.name }}</span>
                </div>
                <Button variant="ghost" size="sm" @click="deleteCategory(cat._id)">
                    <X class="w-4 h-4 text-red-500" />
                </Button>
            </div>
            <p v-if="categories.length === 0" class="text-gray-500 text-sm italic">No categories yet.</p>
        </div>
    </div>
  </Dialog>
</template>
