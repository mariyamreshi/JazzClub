const path = require('node:path');

function index(req, res) {
  res.sendFile(path.resolve(__dirname, '../views/index.html'));
}

module.exports = { index };
