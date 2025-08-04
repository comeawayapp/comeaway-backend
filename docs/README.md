# ComeAway API Documentation

This directory contains the Swagger/OpenAPI documentation for the ComeAway backend API.

## 📁 File Structure

```
docs/
├── swagger.js              # Main Swagger configuration
├── auth.docs.js            # Authentication endpoints
├── sound.docs.js           # Sound management endpoints
├── playlist.docs.js        # Playlist management endpoints
├── category.docs.js        # Category management endpoints
├── subscription.docs.js    # Subscription endpoints
├── favorite.docs.js        # Favorite sounds endpoints
├── user.docs.js            # User management endpoints
├── payment.docs.js         # Payment processing endpoints
├── rating.docs.js          # App rating endpoints
├── narrator.docs.js        # Narrator management endpoints
├── badge.docs.js           # Badge system endpoints
├── email.docs.js           # Email service endpoints
├── activationCode.docs.js  # Activation code endpoints
└── README.md               # This file
```

## 🚀 How to Use

### 1. Access the Documentation
Once the server is running, you can access the API documentation at:
```
http://localhost:5000/api-docs
```

### 2. Adding New Endpoints
To add documentation for new endpoints:

1. **Create a new documentation file** (e.g., `newFeature.docs.js`)
2. **Follow the existing pattern**:
   ```javascript
   /**
    * @swagger
    * components:
    *   schemas:
    *     YourSchema:
    *       type: object
    *       properties:
    *         field1:
    *           type: string
    *         field2:
    *           type: number
    */

   /**
    * @swagger
    * tags:
    *   name: Your Feature
    *   description: Description of your feature
    */

   /**
    * @swagger
    * /api/your-endpoint:
    *   get:
    *     summary: Your endpoint summary
    *     tags: [Your Feature]
    *     responses:
    *       200:
    *         description: Success response
    */
   ```

3. **The file will be automatically picked up** by the Swagger configuration

### 3. Updating Existing Documentation
To update existing endpoints:

1. **Find the relevant documentation file** (e.g., `auth.docs.js` for authentication endpoints)
2. **Edit the JSDoc comments** to reflect your changes
3. **Restart the server** to see the changes

## 📝 Documentation Standards

### Schema Definitions
- Use descriptive names for schemas
- Include all required fields
- Add descriptions for complex fields
- Use proper data types and formats

### Endpoint Documentation
- Use clear, concise summaries
- Group related endpoints with tags
- Document all request/response schemas
- Include error responses
- Add authentication requirements where needed

### Example Structure
```javascript
/**
 * @swagger
 * /api/example:
 *   post:
 *     summary: Create a new resource
 *     tags: [Example]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExampleRequest'
 *     responses:
 *       201:
 *         description: Resource created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExampleResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
```

## 🔧 Configuration

The main Swagger configuration is in `swagger.js`:

- **OpenAPI Version**: 3.0.0
- **Security**: JWT Bearer token authentication
- **Servers**: Development and production environments
- **UI Options**: Custom styling and features enabled

## 🎨 Customization

### UI Customization
You can customize the Swagger UI by modifying the options in `server.js`:

```javascript
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ComeAway API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
  }
}));
```

### Adding Custom CSS
To add custom styling, you can include CSS in the `customCss` option.

## 🔍 Testing Endpoints

The Swagger UI provides an interactive interface to:
- **View all available endpoints**
- **Test endpoints directly** from the browser
- **See request/response schemas**
- **Authenticate with JWT tokens**
- **Download the OpenAPI specification**

## 📚 Resources

- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger JSDoc](https://github.com/Surnet/swagger-jsdoc)
- [Swagger UI Express](https://github.com/scottie1984/swagger-ui-express)

## 🤝 Contributing

When adding new endpoints or updating existing ones:

1. **Update the corresponding documentation file**
2. **Follow the established patterns**
3. **Test the documentation** by accessing `/api-docs`
4. **Ensure all schemas are properly defined**
5. **Include error responses** for all endpoints

## 🚨 Important Notes

- **Restart the server** after making changes to documentation files
- **Keep documentation in sync** with actual API implementation
- **Use consistent naming** for schemas and tags
- **Document all parameters** including query, path, and body parameters
- **Include authentication requirements** for protected endpoints 