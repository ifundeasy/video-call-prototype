require('dotenv').config()

const PORT = process.env.RTC_PORT;
const { PeerServer } = require('peer');

const options = {
  port: PORT,
  path: '/',
  debug: true,
  allow_discovery: true,
  // proxied: false, // TODO: true if app run behind proxy,
  // ssl: { key: '', cert: '' }, // TODO: for SSL option
};
const peer = PeerServer(options, (server) => {
  console.log(`Peer listen on ${PORT}`)
});

peer.on('connection', function (socket) {
  console.log('> peer::connection', socket.id);
});
peer.on('disconnect', function (socket) {
  console.log('> peer::disconnect', socket.id);
});
peer.on('message', function (socket, message) {
  console.log('> peer::message', socket.id, message);
});
peer.on('error', function (socket, message) {
  console.log('> peer::error', socket.id, message);
});