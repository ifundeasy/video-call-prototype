const { ExpressPeerServer } = require('peer');

const options = {
  path: '/',
  debug: true,
  allow_discovery: true,
  proxied: false, // TODO: true if app run behind proxy,
  // ssl: { key: '', cert: '' }, // TODO: for SSL option
};

const attach = (server, app) => {
  const peer = ExpressPeerServer(server, options);

  app.use('/rtc', peer)

  peer.on('connection', (socket) => {
    console.info('> peer::connection', socket.id);
  });

  peer.on('disconnect', (socket) => {
    console.warn('> peer::disconnect', socket.id);
  });

  peer.on('message', (socket, message) => {
    if (message.type === 'HEARTBEAT') {
      // console.debug('> peer::message', socket.id, message);
    } else {
      console.info('> peer::message', socket.id, message)
    }
  });

  peer.on('error', (socket, message) => {
    console.error('> peer::error', socket.id, message);
  });

  return peer
}

module.exports = { attach }
