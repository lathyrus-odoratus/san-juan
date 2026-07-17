import type { Server as HttpServer } from 'node:http'
import { setupGameSocketServer } from '~~/server/utils/gameSocketServer'

interface ListenHooks {
  hook: (name: 'listen', callback: (server: HttpServer) => void) => void
}

export default defineNitroPlugin((nitroApp) => {
  const hooks = nitroApp.hooks as unknown as ListenHooks

  hooks.hook('listen', (server) => {
    const gameSocketServer = setupGameSocketServer(server)

    nitroApp.hooks.hookOnce('close', () => {
      gameSocketServer.close()
    })
  })
})
