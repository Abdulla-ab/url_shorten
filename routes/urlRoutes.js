const express = require('express');
const { shortenUrl, redirectToLongUrl } = require('../controllers/urlController');
const router = express.Router();

/**
 * @swagger
 * /shorten:
 *   post:
 *     summary: Shorten a given URL
 *     description: Given a long URL, it returns a shortened URL.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               long_url:
 *                 type: string
 *                 description: The long URL to shorten
 *                 example: 'https://www.example.com'
 *     responses:
 *       200:
 *         description: The shortened URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 short_url:
 *                   type: string
 *                   example: 'http://short.ly/abc123'
 *       400:
 *         description: Bad Request
 *       500:
 *         description: Internal Server Error
 */
router.post('/shorten', shortenUrl);

/**
 * @swagger
 * /{short_url}:
 *   get:
 *     summary: Redirect to long URL
 *     description: Given a short URL, it redirects to the corresponding long URL.
 *     parameters:
 *       - in: path
 *         name: short_url
 *         required: true
 *         description: The short URL to redirect
 *         schema:
 *           type: string
 *           example: 'abc123'
 *     responses:
 *       200:
 *         description: Redirect to the long URL
 *       404:
 *         description: Short URL not found
 *       500:
 *         description: Internal Server Error
 */
router.get('/:short_url', redirectToLongUrl);

module.exports = router;
