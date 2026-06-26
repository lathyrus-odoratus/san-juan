import type { Ref } from 'vue'

export interface UseOnboardingReturn {
  isCompleted: Ref<boolean>
  currentStep: Ref<number>
  totalSteps: number
  next: () => void
  prev: () => void
  skip: () => void
  complete: () => void
  restart: () => void
}

/**
 * First-visit interface onboarding state.
 * Skeleton — implemented in a later branch.
 */
export function useOnboarding(): UseOnboardingReturn {
  throw new Error('useOnboarding: not implemented')
}
