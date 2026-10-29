'use client'

import { useEffect, useRef } from 'react'

/**
 * Subscribe to real-time notification events via Socket.IO.
 * When the server pushes a new notification, onNotification is called so the client can refetch.
 * Only runs in the browser; requires the app to be run with the custom server (node server.js).
 * Auth is the httpOnly session cookie (`withCredentials: true`).
 */
export function useNotificationSocket(onNotification: () => void) {
  const callbackRef = useRef(onNotification)
  callbackRef.current = onNotification

  useEffect(() => {
    if (typeof window === 'undefined') return

    let socket: any = null
    const connect = () => {
      import('socket.io-client').then(({ io: ioClient }) => {
        socket = ioClient(window.location.origin, {
          path: '/socket.io',
          transports: ['websocket', 'polling'],
          withCredentials: true,
        })
        socket.on('notification', () => {
          callbackRef.current()
        })
        socket.on('connect_error', () => {
          // Fallback to polling only; no need to show error, polling will still work
        })
      })
    }
    connect()
    return () => {
      if (socket) {
        socket.removeAllListeners()
        socket.disconnect()
      }
    }
  }, [])
}
