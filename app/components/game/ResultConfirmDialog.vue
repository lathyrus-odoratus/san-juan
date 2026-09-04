<script setup lang="ts">
defineProps<{
  title: string
  message: string
}>()

const emit = defineEmits<{
  confirm: []
}>()
</script>

<template>
  <section
    class="result-dialog"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="`${title}-title`"
  >
    <h2 :id="`${title}-title`">
      {{ title }}
    </h2>
    <p>{{ message }}</p>
    <footer>
      <button type="button" @click="emit('confirm')">
        確認
      </button>
    </footer>
  </section>
</template>

<style scoped>
.result-dialog {
  width: min(100%, 420px);
  border: 1px solid #8b9a8f;
  border-radius: 8px;
  padding: 24px;
  background: #fbfbf6;
  color: #17201b;
  box-shadow: 0 24px 80px rgb(23 32 27 / 28%);
}

.result-dialog h2,
.result-dialog p {
  margin-top: 0;
}

.result-dialog footer {
  display: flex;
  justify-content: flex-end;
}

.result-dialog button {
  min-height: 40px;
  border: 1px solid #8b9a8f;
  border-radius: 6px;
  padding: 8px 16px;
  background: #fbfbf6;
  color: #17201b;
  cursor: pointer;
}
</style>
