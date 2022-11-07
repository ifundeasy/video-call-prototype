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
      return { [_.startCase(_.toLower(name))]: `assets/models/${el}/runtime` }
    });
  return models2d
}

router.get('/', async (req, res) => {
  res.redirect(`/meet/${uuidv4()}`);
});

router.get('/:roomId', async (req, res) => {
  const { roomId } = req.params;
  console.log(get2dModels())

  res.render('meet', {
    MODELS_2D: get2dModels(),
    NODE_ENV: process.env.NODE_ENV,
    ROOM_ID: roomId,
    SVC_URL: process.env.SVC_URL
  });
});

module.exports = router
