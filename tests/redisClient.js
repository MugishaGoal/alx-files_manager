import redisClient from '../utils/redis';

describe('redisClient', () => {
  it('should set and get a value correctly', async () => {
    await redisClient.set('testKey', 'testValue');
    const value = await redisClient.get('testKey');
    expect(value).toBe('testValue');
  });

  it('should delete a value correctly', async () => {
    await redisClient.set('testKey', 'testValue');
    await redisClient.del('testKey');
    const value = await redisClient.get('testKey');
    expect(value).toBe(null);
  });
});
