# video-call-prototype

## Requirements

* nodejs >= 16.6.0
* redis >= 7.0.1

## WebRTC Topology
`Mesh` or PeerToPeer, support > 2 participant (depend user connection)

## Feature
* Multi room instance
* Chat
* Video conference
* Face motion detector (soon)

## Run on local

Use tunnel for multi device, open new terminal session
```sh
npm i -g localtunnel
lt --port 3030
```

Run server, open new terminal session
```sh
export NODE_ENV=production
export SVC_PORT=3030
export SVC_URL=https://see-your-local-tunnel.local.lt
npm start
```
