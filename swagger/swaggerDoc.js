const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'URL Shortener API',
            version: '1.0.0',
            description: 'A simple API to shorten URLs',
        },
    },
    apis: ['./routes/urlRoutes.js', './controllers/urlController.js'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

module.exports = { swaggerDocs };
