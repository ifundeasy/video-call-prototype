require('dotenv').config()

const Express = require("express");
const Cors = require('cors');
const { v4: uuidv4 } = require("uuid");
const SocketIO = require("socket.io")
const { ExpressPeerServer } = require("peer");


let http, peer;
const io = new SocketIO.Server({
  path: "/io",
  serveClient: false,
  // below are engine.IO options
  pingInterval: 10000,
  pingTimeout: 5000,
  cookie: false,
  cors: {
    origin: '*'
  }
});
const app = Express();
const start = async () => {
  http = await app.listen(process.env.PORT)

  // * Post start execution
  // ...
  peer = await ExpressPeerServer(http, {
    debug: true,
    allow_discovery: true,
    proxied: false, // TODO: true if app run behind proxy,
    // ssl: { key: '', cert: '' }, // TODO: for SSL option
  });
  app.use("/vc", peer);
  peer.on('connection', function (socket) {
    console.log('> peer.on("connection")', socket.id);
  });
  peer.on('disconnect', function (socket) {
    console.log('> peer.on("disconnect")', socket.id);
  });

  await io.attach(http);
  io.on("connection", (socket) => {
    console.log('> io.on("connection")', socket.id)
    socket.on("JOIN_ROOM", ({ sender, data }) => {
      console.log('socket.on("JOIN_ROOM")', socket.id, { sender, data })
      socket.join(sender.roomId);
      socket.to(sender.roomId).emit("USER_JOINED", { sender, data: null });
    });

    socket.on("NEW_MESSAGE", ({ sender, data }) => {
      console.log('socket.on("NEW_MESSAGE")', socket.id, { sender, data })
      io.to(sender.roomId).emit("USER_MESSAGE", { sender, data });
    });
  });

  console.log('HTTP server listen on ' + process.env.PORT)
}

app.set("view engine", "ejs");

app.use('/libs', Express.static("node_modules"))
app.use(Express.static("public"));
app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));
app.use(Express.static('public'));
app.use(Cors());
app.options('*', Cors());

app.get("/", (req, res) => {
  res.send('Hello World!');
});

app.get("/old", (req, res) => {
  res.redirect(`/meet/${uuidv4()}`);
});

app.get("/old/:roomId", (req, res) => {
  res.render("old", {
    roomId: req.params.roomId,
    svcURL: process.env.SVC_URL
  });
});

app.get("/meet", (req, res) => {
  res.redirect(`/meet/${uuidv4()}`);
});

app.get("/meet/:roomId", (req, res) => {
  res.render("meet", {
    roomId: req.params.roomId,
    svcURL: process.env.SVC_URL
  });
});

module.exports = { app, http, peer, io, start };