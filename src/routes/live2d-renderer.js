const express = require('express')
const getLive2dModel = require('../get-live2d-model');

const router = express.Router()

router.get('/:modelKey', async (req, res) => {
  const { roomId, socketId, modelKey } = req.params;
  const [model] = getLive2dModel().filter(el => el.key.toLowerCase() === modelKey.toLowerCase().trim());

  res.render('live2d-renderer', {
    MODEL_LIVE_2D: (model || {}).val,
    NODE_ENV: process.env.NODE_ENV,
    ROOM_ID: roomId,
    SOCKET_ID: socketId,
    SVC_URL: process.env.SVC_URL
  });
});

module.exports = router
