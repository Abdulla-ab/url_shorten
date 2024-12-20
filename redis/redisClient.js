const { createClient } = require('@redis/client');

// Redis Client
const redisClient = createClient();
redisClient.connect().catch(console.error);

module.exports = redisClient;
