const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();

// Express.js config
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

// Express.js options
app.options('*', cors());

// Express.js middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/modules', express.static(path.join(__dirname, '..', 'node_modules')));

// Express.js routes
app.get('/', (req, res) => res.render('home'));
app.use('/meet', require('./routes/meet'))
app.use('/live2d-renderer', require('./routes/live2d-renderer'))

module.exports = app
