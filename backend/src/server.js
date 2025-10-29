const app = require('./app');
const config = require('../config/environment');

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
});