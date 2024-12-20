const { Pool } = require('pg');
const shortid = require('shortid');
const redisClient = require('../redis/redisClient');

// Database Pool
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    port: 5432,
});

// Shorten URL
const shortenUrl = async (req, res) => {
    const { long_url } = req.body;
    if (!long_url) return res.status(400).send({ error: 'Long URL is required' });

    try {
        // Check if URL exists in Redis cache
        const cachedShortUrl = await redisClient.get(long_url);
        if (cachedShortUrl) {
            return res.send({ short_url: `http://short.ly/${cachedShortUrl}` });
        }

        // Check if URL already exists in DB
        const existing = await pool.query('SELECT short_url FROM url_mapping WHERE long_url = $1', [long_url]);
        if (existing.rows.length > 0) {
            await redisClient.set(long_url, existing.rows[0].short_url);
            return res.send({ short_url: `http://short.ly/${existing.rows[0].short_url}` });
        }

        // Generate new short URL
        const short_url = shortid.generate();
        await pool.query(
            'INSERT INTO url_mapping (long_url, short_url) VALUES ($1, $2)',
            [long_url, short_url]
        );

        await redisClient.set(long_url, short_url);

        res.send({ short_url: `http://short.ly/${short_url}` });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'An error occurred' });
    }
};

// Redirect to Long URL
const redirectToLongUrl = async (req, res) => {
    const { short_url } = req.params;

    try {
        // Check Redis cache for long URL
        const cachedLongUrl = await redisClient.get(short_url);
        if (cachedLongUrl) {
            return res.redirect(cachedLongUrl);
        }

        const result = await pool.query('SELECT long_url FROM url_mapping WHERE short_url = $1', [short_url]);
        if (result.rows.length === 0) {
            return res.status(404).send({ error: 'URL not found' });
        }

        // Cache the long URL in Redis for future redirects
        await redisClient.set(short_url, result.rows[0].long_url);

        res.redirect(result.rows[0].long_url);
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'An error occurred' });
    }
};

module.exports = { shortenUrl, redirectToLongUrl };
