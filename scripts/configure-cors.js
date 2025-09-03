const AWS = require('aws-sdk');
require('dotenv').config();

// Configure AWS SDK for DigitalOcean Spaces
const s3 = new AWS.S3({
  endpoint: `https://${process.env.DO_SPACES_ENDPOINT}`,
  accessKeyId: process.env.DO_SPACES_KEY,
  secretAccessKey: process.env.DO_SPACES_SECRET,
  region: process.env.DO_SPACES_REGION,
  s3ForcePathStyle: false,
  signatureVersion: 'v4'
});

const corsConfiguration = {
  CORSRules: [
    {
      AllowedHeaders: ['*'],
      AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
      AllowedOrigins: ['*'], // Change this to your domain in production
      ExposeHeaders: ['ETag', 'x-amz-request-id'],
      MaxAgeSeconds: 3000
    }
  ]
};

async function configureCORS() {
  try {
    console.log('🔧 Configuring CORS for DigitalOcean Spaces...');
    console.log(`📦 Bucket: ${process.env.DO_SPACES_BUCKET}`);
    console.log(`🌐 Endpoint: ${process.env.DO_SPACES_ENDPOINT}`);
    
    const params = {
      Bucket: process.env.DO_SPACES_BUCKET,
      CORSConfiguration: corsConfiguration
    };

    await s3.putBucketCors(params).promise();
    
    console.log('✅ CORS configuration applied successfully!');
    console.log('🎉 Your bucket now allows direct frontend uploads.');
    console.log('');
    console.log('📋 CORS Rules Applied:');
    console.log('   • Allowed Headers: *');
    console.log('   • Allowed Methods: GET, PUT, POST, DELETE, HEAD');
    console.log('   • Allowed Origins: * (all domains)');
    console.log('   • Expose Headers: ETag, x-amz-request-id');
    console.log('   • Max Age: 3000 seconds');
    console.log('');
    console.log('🚀 You can now implement direct frontend uploads!');
    
  } catch (error) {
    console.error('❌ Error configuring CORS:', error.message);
    
    if (error.code === 'NoSuchBucket') {
      console.error('💡 Make sure your bucket name is correct in .env file');
    } else if (error.code === 'InvalidAccessKeyId') {
      console.error('💡 Check your DO_SPACES_KEY in .env file');
    } else if (error.code === 'SignatureDoesNotMatch') {
      console.error('💡 Check your DO_SPACES_SECRET in .env file');
    }
    
    process.exit(1);
  }
}

// Run the configuration
configureCORS();
