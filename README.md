# video-call-prototype

## Requirements

* nodejs >= 16.6.0
* redis >= 7.0.1

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
