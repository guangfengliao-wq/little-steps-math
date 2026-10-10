<script setup lang="ts">
defineProps<{ total: number; known: number; value: string | number; state?: string; blankLeft?: boolean }>()
</script>

<template>
  <div class="decomposition" :aria-label="`${total} 可以分成 ${blankLeft ? value : known} 和 ${blankLeft ? known : value}`">
    <div class="decomposition-total">{{ total }}</div>
    <svg class="decomposition-lines" viewBox="0 0 240 52" aria-hidden="true"><path d="M108 4 L60 48 M132 4 L180 48" /></svg>
    <div class="decomposition-parts"><span>{{ known }}</span><b :class="{ 'blank-left': blankLeft, 'box-correct': state === 'correct', 'box-wrong': state === 'wrong' }">{{ value }}</b></div>
  </div>
</template>
