/**
 * Socket.IO server instance shared with API routes.
 * Set by custom server.js so createNotification can emit real-time events.
 */
let io = null

function setIO(instance) {
  io = instance
}

function getIO() {
  return io
}

/**
 * Room name for a notification recipient. Notifications are per-user, so each
 * connection joins exactly one room and only ever hears about its own events.
 */
function roomFor(userType, userId) {
  return `${userType}:${userId}`
}

/**
 * Emit a notification event so connected clients can refetch.
 * Payload: { userType: 'admin' | 'super_admin' | 'student', userId: number, centerId?: number }
 *
 * Scoped to the recipient's room: a global broadcast would have told every
 * connected browser about every notification in the system, including other
 * tenants' user ids and center ids.
 */
function emitNotification(payload) {
  if (!io) return
  if (!payload?.userType || !payload?.userId) return
  io.to(roomFor(payload.userType, payload.userId)).emit('notification', payload)
}

module.exports = { setIO, getIO, emitNotification, roomFor }
