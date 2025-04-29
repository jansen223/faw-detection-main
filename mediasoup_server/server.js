const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mediasoup = require('mediasoup');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Serve static files from a "public" directory
app.use(express.static(path.join(__dirname, '../public')));

// OR handle "/" manually
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

let worker;
let router;
let producerTransport;
let consumerTransport;
let producer;
let consumer;

(async () => {
  worker = await mediasoup.createWorker();
  router = await worker.createRouter({
    mediaCodecs: [{
      kind: 'video',
      mimeType: 'video/VP8',
      clockRate: 90000
    }]
  });
})();

io.on('connection', socket => {
  console.log('Client connected');

  // Handle transports, producers, consumers, etc.
  // (This needs full implementation based on mediasoup demo: https://mediasoup.org/documentation/v3/)

});

server.listen(3000, () => console.log('🚀 Mediasoup server running on port 3000'));
