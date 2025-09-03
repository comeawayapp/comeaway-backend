const AWS = require('aws-sdk');
const fs = require('fs');
const logger = require('../utils/logger');

class SpacesService {
  constructor() {
    this.bucket = process.env.DO_SPACES_BUCKET;
    this.region = process.env.DO_SPACES_REGION;
    this.accessKey = process.env.DO_SPACES_KEY;
    this.secretKey = process.env.DO_SPACES_SECRET;
    this.endpoint = process.env.DO_SPACES_ENDPOINT;
    
    if (!this.bucket || !this.region || !this.accessKey || !this.secretKey || !this.endpoint) {
      logger.warn('DigitalOcean Spaces configuration incomplete. Some environment variables are missing.');
    }

    // Configure AWS SDK for DigitalOcean Spaces
    this.s3 = new AWS.S3({
      endpoint: `https://${this.endpoint}`,
      accessKeyId: this.accessKey,
      secretAccessKey: this.secretKey,
      region: this.region,
      s3ForcePathStyle: false, // DigitalOcean Spaces uses virtual-hosted-style URLs
      signatureVersion: 'v4'
    });
  }

  /**
   * Upload file to DigitalOcean Spaces using AWS SDK with streaming
   */
  async uploadFile(filePath, objectKey, contentType = 'audio/mpeg', acl = 'public-read', onProgress = null) {
    try {
      if (!this.isConfigured()) {
        throw new Error('DigitalOcean Spaces configuration incomplete');
      }

      // Get file stats
      const fileStats = fs.statSync(filePath);
      const fileSize = fileStats.size;
      
      logger.info('Uploading file to DigitalOcean Spaces using AWS SDK', {
        objectKey,
        fileSize,
        bucket: this.bucket,
        region: this.region
      });

      // Upload parameters
      const uploadParams = {
        Bucket: this.bucket,
        Key: objectKey,
        Body: fs.createReadStream(filePath),
        ACL: acl,
        ContentType: contentType,
        Metadata: {
          'original-filename': objectKey.split('/').pop()
        }
      };

      // Upload with progress tracking
      const result = await this.s3.upload(uploadParams, {
        partSize: 10 * 1024 * 1024, // 10MB parts for multipart upload
        queueSize: 1, // Upload one part at a time
        onProgress: (progress) => {
          if (onProgress) {
            onProgress(progress.loaded, progress.total);
          }
          logger.debug('Upload progress', {
            objectKey,
            loaded: progress.loaded,
            total: progress.total,
            percentage: Math.round((progress.loaded / progress.total) * 100)
          });
        }
      }).promise();

      // Ensure the URL has https:// protocol
      const fileUrl = result.Location.startsWith('http') 
        ? result.Location 
        : `https://${result.Location}`;

      logger.info('File uploaded successfully using AWS SDK', { 
        objectKey, 
        fileSize,
        location: fileUrl 
      });

      return fileUrl;

    } catch (error) {
      logger.error('Error uploading file to DigitalOcean Spaces', {
        error: error.message,
        objectKey,
        filePath
      });
      throw error;
    }
  }

  /**
   * Upload stream directly to DigitalOcean Spaces (for backend proxy)
   */
  async uploadStream(stream, objectKey, contentType = 'audio/mpeg', acl = 'public-read') {
    try {
      if (!this.isConfigured()) {
        throw new Error('DigitalOcean Spaces configuration incomplete');
      }

      logger.info('Uploading stream to DigitalOcean Spaces', {
        objectKey,
        bucket: this.bucket
      });

      const uploadParams = {
        Bucket: this.bucket,
        Key: objectKey,
        Body: stream,
        ACL: acl,
        ContentType: contentType,
        Metadata: {
          'uploaded-at': new Date().toISOString()
        }
      };

      const result = await this.s3.upload(uploadParams).promise();

      // Ensure the URL has https:// protocol
      const fileUrl = result.Location.startsWith('http') 
        ? result.Location 
        : `https://${result.Location}`;

      logger.info('Stream uploaded successfully', { 
        objectKey,
        location: fileUrl 
      });

      return fileUrl;

    } catch (error) {
      logger.error('Error uploading stream to DigitalOcean Spaces', {
        error: error.message,
        objectKey
      });
      throw error;
    }
  }

  /**
   * Delete file from DigitalOcean Spaces using AWS SDK
   */
  async deleteFile(objectKey) {
    try {
      if (!this.isConfigured()) {
        throw new Error('DigitalOcean Spaces configuration incomplete');
      }

      logger.info('Deleting file from DigitalOcean Spaces', { objectKey });

      const deleteParams = {
        Bucket: this.bucket,
        Key: objectKey
      };

      await this.s3.deleteObject(deleteParams).promise();

      logger.info('File deleted successfully from DigitalOcean Spaces', { objectKey });
      return true;

    } catch (error) {
      logger.error('Error deleting file from DigitalOcean Spaces', {
        error: error.message,
        objectKey
      });
      throw error;
    }
  }

  /**
   * Get file URL from object key
   */
  getFileUrl(objectKey) {
    if (!this.bucket || !this.endpoint) {
      throw new Error('DigitalOcean Spaces configuration incomplete');
    }
    return `https://${this.bucket}.${this.endpoint}/${objectKey}`;
  }



  /**
   * Check if service is properly configured
   */
  isConfigured() {
    return !!(this.bucket && this.region && this.accessKey && this.secretKey && this.endpoint);
  }
}

module.exports = new SpacesService();
