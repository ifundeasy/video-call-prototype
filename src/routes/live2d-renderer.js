const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const express = require('express')
const { v4: uuidv4 } = require('uuid');

const router = express.Router()

const get2dModels = () => {
  const models2dLocation = path.resolve(__dirname, '..', '..', 'public', 'assets', 'models');
  const models2d = fs.readdirSync(models2dLocation)
    .filter(el => fs.lstatSync(`${models2dLocation}/${el}`).isDirectory())
    .map(el => {
      const name = el.split(/[\s_-]/g).filter(s => ['pro', 'free', 'en', 'cn', 'jp', 'kr'].indexOf(s) === -1).join(' ')
      const [index] = fs.readdirSync(`${models2dLocation}/${el}/runtime`).filter(file => file.indexOf('model3.json') > -1) || [];
      return {
        key: _.startCase(_.toLower(name)),
        val: index ? `/assets/models/${el}/runtime/${index}` : null
      }
    })
    .filter(el => el.val);
  return models2d
}

router.get('/:modelKey', async (req, res) => {
  const { roomId, socketId, modelKey } = req.params;
  const [model] = get2dModels().filter(el => el.key.toLowerCase() === modelKey.trim());

  res.render('live2d-renderer', {
    MODEL_LIVE_2D: (model || {}).val,
    NODE_ENV: process.env.NODE_ENV,
    ROOM_ID: roomId,
    SOCKET_ID: socketId,
    SVC_URL: process.env.SVC_URL
  });
});

module.exports = router
