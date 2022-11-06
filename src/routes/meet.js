const express = require('express')
const { v4: uuidv4 } = require('uuid');

const manager = require('../manager')

const router = express.Router()

router.get('/', async (req, res) => {
  res.redirect(`/meet/${uuidv4()}`);
});

router.get('/:roomId', async (req, res) => {
  const { roomId } = req.params;

  res.render('meet', {
    NODE_ENV: process.env.NODE_ENV,
    ROOM_ID: roomId,
    SVC_URL: process.env.SVC_URL
  });
});

module.exports = router
