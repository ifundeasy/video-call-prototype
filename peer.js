require('dotenv').config()

const PORT = process.env.RTC_PORT;
const { PeerServer } = require('peer');

const options = {
  port: PORT,
  path: '/',
  debug: true,
  // allow_discovery: true,
  // proxied: false, // TODO: true if app run behind proxy,
  // ssl: { key: '', cert: '' }, // TODO: for SSL option
};
const peer = PeerServer(options, (server) => {
  console.log(`Peer listen on ${PORT}`)
});

peer.on('connection', (socket) => {
  console.info('> peer::connection', socket.id);
});
peer.on('disconnect', (socket) => {
  console.warn('> peer::disconnect', socket.id);
});
peer.on('message', (socket, message) => {
  if (message.type == 'HEARTBEAT') {
    // console.debug('> peer::message', socket.id, message);
  } else {
    console.info('> peer::message', socket.id, message)
  }
    
});
peer.on('error', (socket, message) => {
  console.error('> peer::error', socket.id, message);
});
