<script setup lang="ts">
import { computed, ref } from 'vue'
import rolesData from '~~/data/cards.roles.json'
import type { Role, SelectedRole } from '~~/types/game'

interface RoleCard {
  id: string
  name: Role
  nameZh: string
  commonAction: string
  privilege: string
}

interface RolesFile {
  roles: RoleCard[]
}

const props = defineProps<{
  selectedRoles: SelectedRole[]
  playerNamesById: Record<string, string>
}>()

const emit = defineEmits<{
  hide: []
  confirm: [role: Role]
}>()

const selectedRole = ref<Role | null>(null)
const roles = (rolesData as RolesFile).roles
const selectedRoleByName = computed(() => new Map(props.selectedRoles.map(role => [role.role, role.playerId])))
const statusMessage = computed(() => {
  if (!selectedRole.value) {
    return '選擇一個尚未被使用的職業。'
  }

  const playerId = selectedRoleByName.value.get(selectedRole.value)
  if (!playerId) {
    return `${selectedRole.value} 可以選取。`
  }

  return `此職業已被 ${props.playerNamesById[playerId] ?? playerId} 選取`
})
const canConfirm = computed(() => selectedRole.value !== null && !selectedRoleByName.value.has(selectedRole.value))

function selectRole(role: Role): void {
  if (selectedRoleByName.value.has(role)) {
    selectedRole.value = role
    return
  }

  selectedRole.value = role
}

function confirmRole(): void {
  if (selectedRole.value && canConfirm.value) {
    emit('confirm', selectedRole.value)
  }
}
</script>

<template>
  <section class="role-modal" role="dialog" aria-modal="true" aria-labelledby="role-modal-title">
    <header>
      <h2 id="role-modal-title">
        選擇你的職業
      </h2>
    </header>

    <div class="role-modal__roles">
      <button
        v-for="role in roles"
        :key="role.id"
        type="button"
        class="role-card"
        :class="{
          'role-card--selected': selectedRole === role.name,
          'role-card--disabled': selectedRoleByName.has(role.name)
        }"
        :aria-pressed="selectedRole === role.name"
        :disabled="selectedRoleByName.has(role.name)"
        @click="selectRole(role.name)"
      >
        <span>{{ role.nameZh }}</span>
        <strong>{{ role.name }}</strong>
        <small>{{ role.privilege }}</small>
        <span v-if="selectedRoleByName.has(role.name)" class="role-card__owner">
          {{ playerNamesById[selectedRoleByName.get(role.name) ?? ''] ?? '已選取' }}
        </span>
      </button>
    </div>

    <p class="role-modal__status">
      {{ statusMessage }}
    </p>

    <footer>
      <button type="button" @click="emit('hide')">
        隱藏
      </button>
      <button type="button" :disabled="!canConfirm" @click="confirmRole">
        確定
      </button>
    </footer>
  </section>
</template>

<style scoped>
.role-modal {
  width: min(100%, 820px);
  border: 1px solid #8b9a8f;
  border-radius: 8px;
  padding: 24px;
  background: #fbfbf6;
  color: #17201b;
  box-shadow: 0 24px 80px rgb(23 32 27 / 28%);
}

.role-modal h2 {
  margin: 0;
}

.role-modal__roles {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin-top: 22px;
}

.role-card {
  display: flex;
  min-height: 178px;
  flex-direction: column;
  justify-content: space-between;
  border: 1px solid #9cab99;
  border-radius: 8px;
  padding: 12px;
  background: #eef3e8;
  color: #17201b;
  text-align: left;
  cursor: pointer;
}

.role-card--selected {
  border-color: #c9783f;
  box-shadow: 0 0 0 3px rgb(201 120 63 / 22%);
}

.role-card--disabled {
  background: #d7d9d1;
  color: #69726a;
  cursor: not-allowed;
}

.role-card__owner {
  border-radius: 999px;
  padding: 3px 6px;
  background: #d7a449;
  font-size: 0.72rem;
  font-weight: 700;
}

.role-modal__status {
  min-height: 22px;
  color: #8b4d2c;
  text-align: center;
}

.role-modal footer {
  display: flex;
  justify-content: space-between;
}

.role-modal footer button {
  min-height: 40px;
  border: 1px solid #8b9a8f;
  border-radius: 6px;
  padding: 8px 16px;
  background: #fbfbf6;
  color: #17201b;
  cursor: pointer;
}

.role-modal footer button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (max-width: 760px) {
  .role-modal__roles {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
