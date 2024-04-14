// import redisClient from './utils/redis';
import { createClient, print } from 'redis';

(async () => {
//   console.log(redisClient.isAlive());
  const redisClient = createClient();
  redisClient.on('error', (err) => console.log('Redis client not connected to the server', err.message));
  redisClient.on('connect', () => console.log('Redis client connected to the server'));
  redisClient.get('schoolName', (err, reply) => {
    if (err) console.log(err);
    print(reply);
  });
  //   console.log(await redisClient.get('myKey'));
  //   await redisClient.set('myKey', 12, 5);
  //   console.log(await redisClient.get('myKey'));

//   setTimeout(async () => {
//     console.log(await redisClient.get('myKey'));
//   }, 1000 * 10);
})();
