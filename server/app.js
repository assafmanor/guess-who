const PORT = process.env.PORT || 3000;

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');

const debug = require('debug')('guesswho:app');
const app = express();
const http = require('http').createServer(app);
app.io = require('socket.io')(http);

debug('booting app');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

http.listen(PORT, err => {
  debug('listening on port %d', PORT);
});

app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'pug');

app.use(express.static('public'));

app.use((err, req, res, next) => {
  res.status(404).render(NOT_FOUND, {
    title: 'לא נמצא',
    css: '../' + CSS,
    errorMessage: err.message
  });
});

require('./routes/index.js').router(app);
