require('dotenv').config();

const PORT = process.env.SVC_PORT;

const http = require('http');

const app = require('./src/app');
const io = require('./src/io');
const rtc = require('./src/rtc');
const manager = require('./src/manager')

const server = http.createServer(app)

io.attach(server)
rtc.attach(server, app)

server.listen(PORT, async () => {
  console.log(`Service listen on ${PORT}`)
})

// so the program will not close instantly
process.stdin.resume();

async function exitHandler(options, exitCode) {
  if (options.cleanup) {
    await manager.flush()
  }
  if (exitCode || exitCode === 0) console.info(`Process exited with code: ${exitCode}`);
  if (options.exit) process.exit();
}

// do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));

// catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { cleanup: true, exit: true }));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, { cleanup: true, exit: true }));
process.on('SIGUSR2', exitHandler.bind(null, { cleanup: true, exit: true }));

// catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { cleanup: true, exit: true }));
