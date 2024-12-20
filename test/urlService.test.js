const request = require('supertest');
const { Pool } = require('pg');
const redisClient = require('../redis/redisClient');
const { shortenUrl, redirectToLongUrl } = require('./urlService');

// Mock PostgreSQL pool
jest.mock('pg');
const mockQuery = jest.fn();
Pool.mockImplementation(() => ({
    query: mockQuery,
}));

// Mock Redis client
jest.mock('../redis/redisClient');
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
redisClient.get.mockImplementation(mockRedisGet);
redisClient.set.mockImplementation(mockRedisSet);

describe('URL Shortening Service', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('shortenUrl', () => {
        it('should return an error if long_url is not provided', async () => {
            const response = await request(shortenUrl).post('/shorten-url').send({});
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Long URL is required');
        });

        it('should return cached short URL if it exists in Redis', async () => {
            const longUrl = 'http://examplesatabctyuwfjj12jnjvdsiv33.com';
            const shortUrl = 'abcd1234';
            mockRedisGet.mockResolvedValue(shortUrl);

            const response = await request(shortenUrl)
                .post('/shorten-url')
                .send({ long_url: longUrl });

            expect(response.status).toBe(200);
            expect(response.body.short_url).toBe(`http://short.ly/${shortUrl}`);
            expect(mockRedisGet).toHaveBeenCalledWith(longUrl);
        });

        it('should return existing short URL from DB and cache it in Redis', async () => {
            const longUrl = 'http://examplesatabctyuwfjj12jnjvdsiv33.com';
            const shortUrl = 'abcd1234';
            mockRedisGet.mockResolvedValue(null);
            mockQuery.mockResolvedValueOnce({ rows: [{ short_url: shortUrl }] });

            const response = await request(shortenUrl)
                .post('/shorten-url')
                .send({ long_url: longUrl });

            expect(response.status).toBe(200);
            expect(response.body.short_url).toBe(`http://short.ly/${shortUrl}`);
            expect(mockQuery).toHaveBeenCalledWith(
                'SELECT short_url FROM url_mapping WHERE long_url = $1',
                [longUrl]
            );
            expect(mockRedisSet).toHaveBeenCalledWith(longUrl, shortUrl);
        });

        it('should generate a new short URL, store it in DB and cache it in Redis', async () => {
            const longUrl = 'http://examplesatabctyuwfjj12jnjvdsiv33.com';
            const shortUrl = 'abcd1234';
            mockRedisGet.mockResolvedValue(null);
            mockQuery.mockResolvedValueOnce({ rows: [] }); // No existing URL
            mockQuery.mockResolvedValueOnce({ rows: [] }); // No DB errors

            const response = await request(shortenUrl)
                .post('/shorten-url')
                .send({ long_url: longUrl });

            expect(response.status).toBe(200);
            expect(response.body.short_url).toBe(`http://short.ly/${shortUrl}`);
            expect(mockQuery).toHaveBeenCalledWith(
                'SELECT short_url FROM url_mapping WHERE long_url = $1',
                [longUrl]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                'INSERT INTO url_mapping (long_url, short_url) VALUES ($1, $2)',
                [longUrl, shortUrl]
            );
            expect(mockRedisSet).toHaveBeenCalledWith(longUrl, shortUrl);
        });

        it('should return 500 if there is a database error', async () => {
            const longUrl = 'http://examplesatabctyuwfjj12jnjvdsiv33.com';
            mockRedisGet.mockResolvedValue(null);
            mockQuery.mockRejectedValue(new Error('DB Error'));

            const response = await request(shortenUrl)
                .post('/shorten-url')
                .send({ long_url: longUrl });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('An error occurred');
        });
    });

    describe('redirectToLongUrl', () => {
        it('should redirect to long URL if cached in Redis', async () => {
            const shortUrl = 'abcd1234';
            const longUrl = 'http://examplesatabctyuwfjj12jnjvdsiv33.com';
            mockRedisGet.mockResolvedValue(longUrl);

            const response = await request(redirectToLongUrl)
                .get(`/redirect/${shortUrl}`);

            expect(response.status).toBe(302);
            expect(response.header.location).toBe(longUrl);
            expect(mockRedisGet).toHaveBeenCalledWith(shortUrl);
        });

        it('should fetch long URL from DB and cache it in Redis if not found in Redis', async () => {
            const shortUrl = 'abcd1234';
            const longUrl = 'http://examplesatabctyuwfjj12jnjvdsiv33.com';
            mockRedisGet.mockResolvedValue(null);
            mockQuery.mockResolvedValueOnce({ rows: [{ long_url: longUrl }] });

            const response = await request(redirectToLongUrl)
                .get(`/redirect/${shortUrl}`);

            expect(response.status).toBe(302);
            expect(response.header.location).toBe(longUrl);
            expect(mockQuery).toHaveBeenCalledWith(
                'SELECT long_url FROM url_mapping WHERE short_url = $1',
                [shortUrl]
            );
            expect(mockRedisSet).toHaveBeenCalledWith(shortUrl, longUrl);
        });

        it('should return 404 if short URL does not exist', async () => {
            const shortUrl = 'abcd1234';
            mockRedisGet.mockResolvedValue(null);
            mockQuery.mockResolvedValueOnce({ rows: [] }); // No result

            const response = await request(redirectToLongUrl)
                .get(`/redirect/${shortUrl}`);

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('URL not found');
        });

        it('should return 500 if there is a database error', async () => {
            const shortUrl = 'abcd1234';
            mockRedisGet.mockResolvedValue(null);
            mockQuery.mockRejectedValue(new Error('DB Error'));

            const response = await request(redirectToLongUrl)
                .get(`/redirect/${shortUrl}`);

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('An error occurred');
        });
    });
});
