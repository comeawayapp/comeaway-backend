/**
 * DigitalOcean Spaces Configuration
 * 
 * This file documents the required environment variables for DigitalOcean Spaces integration.
 * Add these variables to your .env file to enable cloud storage.
 */

module.exports = {
  /**
   * Required Environment Variables:
   * 
   * DO_SPACES_ENDPOINT - The DigitalOcean Spaces endpoint (e.g., nyc3.digitaloceanspaces.com)
   * DO_SPACES_BUCKET - Your Spaces bucket name
   * DO_SPACES_REGION - The region where your bucket is located (e.g., nyc3)
   * DO_SPACES_KEY - Your Spaces access key
   * DO_SPACES_SECRET - Your Spaces secret key
   * 
   * Example .env configuration:
   * 
   * DO_SPACES_ENDPOINT=nyc3.digitaloceanspaces.com
   * DO_SPACES_BUCKET=my-app-sounds
   * DO_SPACES_REGION=nyc3
   * DO_SPACES_KEY=your_access_key_here
   * DO_SPACES_SECRET=your_secret_key_here
   * 
   * How to get these values:
   * 1. Go to DigitalOcean Console > Spaces
   * 2. Create a new Space or select existing one
   * 3. Go to Settings > API Keys
   * 4. Generate new API key pair
   * 5. Note the endpoint and region from your Space URL
   */
  
  // Validation function to check if all required variables are set
  validateConfig() {
    const required = [
      'DO_SPACES_ENDPOINT',
      'DO_SPACES_BUCKET', 
      'DO_SPACES_REGION',
      'DO_SPACES_KEY',
      'DO_SPACES_SECRET'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.warn(`⚠️  DigitalOcean Spaces configuration incomplete. Missing: ${missing.join(', ')}`);
      console.warn('   Files will be stored locally until configuration is complete.');
      return false;
    }
    
    console.log('✅ DigitalOcean Spaces configuration complete');
    return true;
  },
  
  // Get configuration object
  getConfig() {
    return {
      endpoint: process.env.DO_SPACES_ENDPOINT,
      bucket: process.env.DO_SPACES_BUCKET,
      region: process.env.DO_SPACES_REGION,
      accessKey: process.env.DO_SPACES_KEY,
      secretKey: process.env.DO_SPACES_SECRET
    };
  }
};
