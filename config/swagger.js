import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'GoTravelX API',
            version: '1.0.0',
            description: 'API documentation for GoTravelX Backend',
        },
        servers: [
            {
                url: 'http://localhost:3000/v1',
                description: 'Local server',
            },
            {
                url: 'https://api.gotravelx.com/v1',
                description: 'production server',
            },
            {
                url: 'https://api.dev.gotravelx.com/v1',
                description: 'Development server',
            },
            {
                url: 'https://api.qa.gotravelx.com/v1',
                description: 'QA server',
            },
            {
                url: 'https://api.stg.gotravelx.com/v1',
                description: 'Staging server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./routes/*.js'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
