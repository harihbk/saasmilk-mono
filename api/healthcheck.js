const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 8000,
  path: '/api',
  method: 'GET',
  timeout: 3000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

req.on('error', () => {
  process.exit(1);
});

req.on('timeout', () => {
  req.abort();
  process.exit(1);
});

req.end();