const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = 3001; // Run proxy on port 3001

app.use(cors());

// Proxy route
app.use('/videoproxy', createProxyMiddleware({
    target: 'https://vdo.ninja', // Base URL
    changeOrigin: true,
    pathRewrite: {
        '^/videoproxy': '', // Remove /videoproxy from path
    },
    ws: true, // WebSocket support if needed
    onProxyReq: (proxyReq, req, res) => {
        proxyReq.setHeader('Origin', 'https://vdo.ninja');
    }
}));

app.listen(PORT, () => {
    console.log(`Proxy server running at http://localhost:${PORT}`);
});
