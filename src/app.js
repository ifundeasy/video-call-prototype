const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();

// Express.js config
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

// Express.js options
app.options('*', cors());

// Express.js middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/libs', express.static(path.join(__dirname, '..', 'node_modules')));

// Express.js routes
app.get('/', (req, res) => res.send('Hello World!'));
app.use('/old', require('./routes/old'))
app.use('/meet', require('./routes/meet'))

// const { ExpressPeerServer } = require('peer');
  
// const options = {
//   path: '/',
//   debug: true,
//   // allow_discovery: true,
//   // proxied: false, // TODO: true if app run behind proxy,
//   // ssl: { key: '', cert: '' }, // TODO: for SSL option
// };

// const peer = ExpressPeerServer(server, options);

// app.use('/peerjs', peer)

// peer.on('connection', (socket) => {
//   console.info('> peer::connection', socket.id);
// });

// peer.on('disconnect', (socket) => {
//   console.warn('> peer::disconnect', socket.id);
// });

// peer.on('message', (socket, message) => {
//   if (message.type == 'HEARTBEAT') {
//     // console.debug('> peer::message', socket.id, message);
//   } else {
//     console.info('> peer::message', socket.id, message)
//   }
    
// });

// peer.on('error', (socket, message) => {
//   console.error('> peer::error', socket.id, message);
// });

module.exports = app
