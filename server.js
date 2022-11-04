require('dotenv').config();

const PORT = process.env.SVC_PORT;

const http = require('http');
const app = require('./src/app');
const io = require('./src/io');

const server = http.createServer(app)

io.attach(server)
server.listen(PORT, (server) => {
  console.log(`Service listen on ${PORT}`)
})
