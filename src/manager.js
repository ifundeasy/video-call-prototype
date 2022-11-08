/* eslint-disable no-use-before-define, prefer-destructuring */

const Promise = require('bluebird')
const redis = require('./redis')()

const randomizeHost = async (roomId, { socketId, peerId } = {}) => {
  let host;
  const data = await getUsers(roomId);

  if (data.host) host = data.host;
  else if (socketId && peerId) host = `${socketId}:${peerId}`
  else host = data.participants[0]

  if (host) return redis.set(`stream:${roomId}:${host}`, 'host')
  return false
}

const getUserRooms = async ({ socketId, peerId = '*' }) => Promise.map(redis.keys(`stream:*:${socketId}:${peerId}`), async (key) => {
  // [roomId, socketId, peerId]
  key.split(/:|\|/g).slice(1)
})

const getUsers = async (roomId) => {
  const data = {
    host: null,
    participants: [],
    accounts: {}
  };
  await Promise.each(redis.keys(`*:${roomId}:*`), async (key) => {
    const [k, , socketId, peerId] = key.split(':');
    const id = `${socketId}:${peerId}`
    const value = await redis.get(key)
    if (k === 'account') {
      data.accounts[id] = JSON.parse(value)
    } else if (value === 'host') data.host = id
    else data.participants.push(id)
  })

  return data;
}

const addUser = async (roomId, {
  socketId, peerId, userId, userName
}, status = 'participant') => {
  await redis.set(`stream:${roomId}:${socketId}:${peerId}`, status)
  await redis.set(`account:${roomId}:${socketId}:${peerId}`, JSON.stringify({ userId, userName }))
  if (status === 'host') {
    return randomizeHost(roomId, {
      socketId, peerId, userId, userName
    })
  }
  return randomizeHost(roomId)
}

const removeUser = async (roomId, { socketId, peerId = '*' }) => {
  await Promise.each(redis.keys(`stream:${roomId}:${socketId}:${peerId}`), async (key) => redis.del(key))
  await Promise.each(redis.keys(`account:${roomId}:${socketId}:${peerId}`), async (key) => redis.del(key))
  return randomizeHost(roomId)
}

const flush = async () => {
  await Promise.each(redis.keys('stream:*'), async (key) => redis.del(key))
  await Promise.each(redis.keys('account:*'), async (key) => redis.del(key))
}

module.exports = {
  flush,
  getUsers,
  addUser,
  removeUser,
  randomizeHost,
  getUserRooms
}
