import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '~~/types/events'

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export default defineNuxtPlugin(() => {
  const gameSocket: GameSocket = io('/game', {
    autoConnect: false,
    path: '/socket.io',
    // Server 端只開 polling：dev 的 WebSocket upgrade 會被 Vite HMR 攔走
    transports: ['polling']
  })

  return {
    provide: {
      gameSocket
    }
  }
})

declare module '#app' {
  interface NuxtApp {
    $gameSocket: GameSocket
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $gameSocket: GameSocket
  }
}
