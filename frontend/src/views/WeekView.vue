<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { format, addDays, startOfWeek, isSameDay, parseISO, differenceInMinutes, startOfDay, isToday } from 'date-fns'

const props = defineProps({
  events: Array,
  currentDate: Date,
  categories: Array,
  slotHeight: {
    type: Number,
    default: 48
  }
})

const emit = defineEmits(['event-click', 'slot-click'])

const weekDates = computed(() => {
  const start = startOfWeek(props.currentDate)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
})

const hours = Array.from({ length: 24 }, (_, i) => i)

// Current Time Logic
const now = ref(new Date())
let timer = null

onMounted(() => {
    timer = setInterval(() => {
        now.value = new Date()
    }, 60000) // Update every minute
})

onUnmounted(() => {
    if (timer) clearInterval(timer)
})

const currentTimeTop = computed(() => {
    const start = startOfDay(now.value)
    const minutes = differenceInMinutes(now.value, start)
    return (minutes / 1440) * 100
})

const getEventStyle = ({ event, layout }, dayDate) => {
    if (!event.start.dateTime || !event.end.dateTime) return {} // Skip all day for now
    
    const start = parseISO(event.start.dateTime)
    const end = parseISO(event.end.dateTime)
    
    // Only verify day match (basic logic, doesn't handle multi-day crossing well)
    if (!isSameDay(start, dayDate)) return { display: 'none' }

    // Event style logic
    const startMinutes = differenceInMinutes(start, startOfDay(start))
    const durationMinutes = differenceInMinutes(end, start)
    
    const top = (startMinutes / 1440) * 100
    const height = (durationMinutes / 1440) * 100

    const color = event.extendedProps?.category?.color || '#3b82f6'
    
    // Layout calc
    const colParams = layout || { col: 0, maxCols: 1 }
    const widthPercent = 90 / colParams.maxCols
    const leftPercent = 5 + (colParams.col * widthPercent)
    
    // Declined logic
    const isDeclined = event.attendees?.find(a => a.self)?.responseStatus === 'declined'

    return {
        top: `${top}%`,
        height: `calc(${height}% - 2px)`,
        backgroundColor: color,
        color: '#fff',
        position: 'absolute',
        width: `${widthPercent}%`,
        left: `${leftPercent}%`,
        borderRadius: '4px',
        fontSize: '0.75rem',
        padding: '2px 4px',
        overflow: 'hidden',
        zIndex: 10 + colParams.col,
        border: '1px solid white',
        ...(isDeclined ? {
            opacity: '0.5',
            textDecoration: 'line-through'
        } : {})
    }
}

const getDayEventsWrapper = (date) => {
    // 1. Filter events for this day
    const dayEvents = props.events.filter(event => {
        if (!event.start.dateTime) return false
        const start = parseISO(event.start.dateTime)
        return isSameDay(start, date)
    }).sort((a, b) => parseISO(a.start.dateTime) - parseISO(b.start.dateTime))

    if (dayEvents.length === 0) return []

    // 2. Expand events with time helper properties
    const events = dayEvents.map(e => ({
        ...e,
        startUnix: parseISO(e.start.dateTime).getTime(),
        endUnix: parseISO(e.end.dateTime).getTime()
    }))

    // 3. Group overlapping events
    const columns = []
    let lastEventEnd = null

    // Simple column packing algorithm
    // We assign each event to a "column" index.
    // If an event overlaps with an existing column, we try the next.
    // We track the end time of the last event in each column.
    
    // Reset visual properties
    events.forEach(e => {
        e.visualCol = 0
        e.visualMaxCols = 1
    })
    
    // Group adjacent/overlapping events to determine shared width
    // This is a simplified "Bucket" approach. 
    // A proper graph coloring is ideal but complex. 
    // Let's use a standard "Pack overlapping groups" algo.

    // Algorithm:
    // 1. Iterate events.
    // 2. Find all events that collide with current event.
    // 3. Assign columns to minimize width.

    // Simplified approach: Column + Width Sharing
    const collisions = [] // Array of arrays (groups)

    // Helper to check overlap
    const overlaps = (a, b) => a.startUnix < b.endUnix && b.startUnix < a.endUnix

    events.forEach(event => {
         // Place in first available visual column
         let colIndex = 0
         
         // Find collisions with layout-ed events so far in this group logic?
         // Actually better:
         // Just place them in columns 0..N
         // Then for every group of overlapping events, set width = 100/N
         
         // Let's calculate visualCol (left position) first
         while (true) {
             let collisionFound = false
             for (const other of events) {
                 if (other === event) break // Only check previous
                 if (overlaps(event, other) && other.visualCol === colIndex) {
                     collisionFound = true
                     break
                 }
             }
             if (!collisionFound) break
             colIndex++
         }
         event.visualCol = colIndex
    })

    // Now determine Total Columns (Max Width divisor) for each event
    // For each event, count how many events overlap it at ANY point in time, 
    // OR simplify: Finds max(visualCol) in the cluster.
    
    // Let's just do: For any event, its width is 1 / (max cols in its collision group).
    // This is hard to perfect. Simple approximation:
    // Width = 100% / (max(visualCol) + 1) of the overlapping cluster?
    // Let's refine:
    
    events.forEach(event => {
        // Find all overlapping events
        const overlapping = events.filter(other => overlaps(event, other))
        // The width should be shared among the maximum number of concurrent events
        // But simply: Standard calendar view often just expands to max columns.
        
        // Find maximum visualCol index among all overlapping events to determine "Container Size"
        // This is a visual heuristic.
        let maxCol = event.visualCol
        overlapping.forEach(other => {
             if (other.visualCol > maxCol) maxCol = other.visualCol
        })
        
        // Also need to check if ANY overlapping event has a higher col index, 
        // effectively expanding the "Grid" for this event.
        // Let's look at the entire clique.
        
        // Robust way:
        // Set width = (100 / (maxCol + 1))
        // Position = visualCol * width
        
        event.visualMaxCols = maxCol + 1
    })

    return events.map(event => ({ event, layout: { col: event.visualCol, maxCols: event.visualMaxCols }}))
}

const handleSlotClick = (date, hour) => {
    const d = new Date(date)
    d.setHours(hour, 0, 0, 0)
    emit('slot-click', d)
}
</script>

<template>
    <div class="border rounded-lg overflow-hidden flex flex-col h-[calc(100vh-200px)]">
        <!-- Header -->
        <div class="grid grid-cols-[60px_1fr] border-b bg-gray-50 flex-none">
            <div class="p-2 text-xs text-gray-500 text-center pt-8">Time</div>
            <div class="grid grid-cols-7 divide-x">
                <div v-for="date in weekDates" :key="date" class="p-2 text-center">
                    <div class="text-xs font-medium text-gray-500">{{ format(date, 'EEE') }}</div>
                    <div class="text-lg font-bold" :class="{ 'text-blue-600': isSameDay(date, new Date()) }">
                        {{ format(date, 'd') }}
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Body -->
        <div class="flex-1 overflow-y-auto relative">
            <div class="grid grid-cols-[60px_1fr]">
                <!-- Time Label Column -->
                <div class="bg-gray-50 border-r">
                   <div 
                        v-for="hour in hours" 
                        :key="hour" 
                        class="border-b text-xs text-right pr-2 pt-1 text-gray-400"
                        :style="{ height: `${slotHeight}px` }"
                    >
                       {{ format(new Date().setHours(hour), 'ha') }}
                   </div>
                </div>
                
                <!-- Grid -->
                <div class="grid grid-cols-7 divide-x relative">
                    <!-- Lines -->
                    <div class="col-span-7 absolute inset-0 z-0 pointer-events-none">
                        <div 
                            v-for="hour in hours" 
                            :key="hour" 
                            class="border-b border-gray-100"
                            :style="{ height: `${slotHeight}px` }"
                        ></div>
                    </div>

                    <!-- Days -->
                    <div 
                        v-for="date in weekDates" 
                        :key="date" 
                        class="relative group z-10"
                        :style="{ height: `${24 * slotHeight}px` }"
                    >
                        <!-- Clickable slots -->
                        <div 
                            v-for="hour in hours" 
                            :key="hour"
                            @click="handleSlotClick(date, hour)"
                            class="cursor-pointer hover:bg-gray-50/50"
                            :style="{ height: `${slotHeight}px` }"
                        ></div>

                        <!-- Events -->
                         <div 
                            v-for="event in getDayEventsWrapper(date)" 
                            :key="event.event.id"
                            :style="getEventStyle(event, date)"
                            @click.stop="$emit('event-click', event.event)"
                        >
                            <div class="font-bold truncate">{{ event.event.summary }}</div>
                            <div class="truncate" v-if="event.event.start.dateTime">
                                {{ format(parseISO(event.event.start.dateTime), 'h:mm a') }}
                            </div>
                        </div>

                        <!-- Current Time Marker -->
                        <div 
                            v-if="isToday(date)" 
                            class="absolute w-full h-px bg-red-500 z-50 pointer-events-none" 
                            :style="{ top: currentTimeTop + '%' }"
                        >
                            <div class="absolute -left-1 -mt-1 w-2 h-2 rounded-full bg-red-500"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
