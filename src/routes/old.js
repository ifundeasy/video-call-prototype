const express = require('express')
const { v4: uuidv4 } = require('uuid');

const router = express.Router()

router.get('/', (req, res) => {
  res.redirect(`/meet/${uuidv4()}`);
});

router.get('/:roomId', (req, res) => {
  res.render('old', {
    NODE_ENV: process.env.NODE_ENV,
    ROOM_ID: req.params.roomId,
    RTC_URL: process.env.RTC_URL,
    SVC_URL: process.env.SVC_URL
  });
});

module.exports = router
