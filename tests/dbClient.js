import dbClient from '../utils/db';

describe('dbClient', () => {
  it('should be connected to the database', async () => {
    const isAlive = dbClient.isAlive();
    expect(isAlive).toBe(true);
  });

  it('should count the documents in a collection', async () => {
    const nbUsers = await dbClient.nbUsers();
    expect(typeof nbUsers).toBe('number');

    const nbFiles = await dbClient.nbFiles();
    expect(typeof nbFiles).toBe('number');
  });
});
