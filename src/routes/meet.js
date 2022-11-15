const express = require('express')
const { v4: uuidv4 } = require('uuid');
const getLive2dModel = require('../get-live2d-model');

const router = express.Router()

router.get('/', async (req, res) => {
  res.redirect(`/meet/${uuidv4()}`);
});

router.get('/:roomId', async (req, res) => {
  const { roomId } = req.params;

  res.render('meet', {
    MODELS_2D: getLive2dModel(),
    NODE_ENV: process.env.NODE_ENV,
    ROOM_ID: roomId,
    SVC_URL: process.env.SVC_URL
  });
});

module.exports = router
