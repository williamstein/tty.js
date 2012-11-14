/**
 * tty.js
 * Copyright (c) 2012, Christopher Jeffrey (MIT License)
 */

var http = require('http')
  , express = require('express')
  , io = require('socket.io')
  , pty = require('pty.js');

/**
 * tty.js
 */

process.title = 'tty.js';

/**
 * Open Terminal
 */

var buff = []
  , socket
  , term;

var term = pty.fork(process.env.SHELL || 'sh', [], {
  name: 'xterm',
  cols: 80,
  rows: 24,
  cwd: process.env.HOME
});

term.on('data', function(data) {
  if (!sockets) {
      buff.push(data);
  } else {
      for(i=0; i<sockets.length; i++) {
         sockets[i].emit('data', data);
      }
  }
});

console.log(''
  + 'Created shell with pty master/slave'
  + ' pair (master: %d, pid: %d)',
  term.fd, term.pid);

/**
 * App & Server
 */

var app = express()
  , server = http.createServer(app);

app.use(function(req, res, next) {
  var setHeader = res.setHeader;
  res.setHeader = function(name) {
    switch (name) {
      case 'Cache-Control':
      case 'Last-Modified':
      case 'ETag':
        return;
    }
    return setHeader.apply(res, arguments);
  };
  next();
});

app.use(express.static(__dirname));
app.use(express.static(__dirname + '/../static'));

server.listen(8123);

/**
 * Sockets
 */

io = io.listen(server);

io.configure(function() {
  io.disable('log');
});

sockets = []
io.sockets.on('connection', function(sock) {
  sockets.push(sock);

  sock.on('data', function(data) {
    term.write(data);
  });

  sock.on('disconnect', function() {
    /* TODO */
  });

  while (buff.length) {
    sock.emit('data', buff.shift());
  }
});
