const fs = require('fs');
const { createClient } = require('redis');

const opts = {
  db: process.env.REDIS_DB,
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD
}

let redis;
module.exports = () => {
  if (redis) return redis;

  console.log('Creating redis connection')
  const redisPassword = fs.existsSync(opts.password)
    ? fs.readFileSync(opts.password).toString().replace(/\n$/, '')
    : opts.password;

  const acl = redisPassword ? `${opts.username}:${redisPassword}@` : '';
  const config = {
    url: `redis://${acl}${opts.host}:${opts.port}`
  };

  redis = createClient(config);

  redis.on('connect', async () => {
    console.log('Redis connected');
  });

  redis.on('error', (message) => {
    redis = undefined;
    console.error('Redis error', message);
  });

  redis.connect().then(() => {
    redis.select(opts.db)
  });

  return redis;
};
