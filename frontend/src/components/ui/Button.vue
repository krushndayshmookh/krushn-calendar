<script setup>
import { cn } from '@/lib/utils'

defineProps({
  variant: {
    type: String,
    default: 'default' // default, ghost, destructive, outline
  },
  class: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <button
    :class="cn(
      'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2',
      variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90',
      variant === 'destructive' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      variant === 'outline' && 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      variant === 'ghost' && 'hover:bg-accent hover:text-accent-foreground',
      $props.class
    )"
  >
    <slot />
  </button>
</template>

<style scoped>
.bg-primary { @apply bg-black text-white; }
.bg-destructive { @apply bg-red-600 text-white; }
.bg-accent { @apply bg-gray-100; }
</style>
