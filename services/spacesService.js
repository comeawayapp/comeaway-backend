const crypto = require('crypto');
const fs = require('fs');
const axios = require('axios');
const logger = require('../utils/logger');

class SpacesService {
  constructor() {
    this.endpoint = process.env.DO_SPACES_ENDPOINT;
    this.bucket = process.env.DO_SPACES_BUCKET;
    this.region = process.env.DO_SPACES_REGION;
    this.accessKey = process.env.DO_SPACES_KEY;
    this.secretKey = process.env.DO_SPACES_SECRET;
    
    if (!this.endpoint || !this.bucket || !this.region || !this.accessKey || !this.secretKey) {
      logger.warn('DigitalOcean Spaces configuration incomplete. Some environment variables are missing.');
    }
  }

  /**
   * Generate AWS4 signature for DigitalOcean Spaces
   */
  generateSignature(stringToSign, date, region) {
    const dateKey = crypto.createHmac('sha256', `AWS4${this.secretKey}`).update(date).digest();
    const dateRegionKey = crypto.createHmac('sha256', dateKey).update(region).digest();
    const dateRegionServiceKey = crypto.createHmac('sha256', dateRegionKey).update('s3').digest();
    const signingKey = crypto.createHmac('sha256', dateRegionServiceKey).update('aws4_request').digest();
    
    return crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  }

  /**
   * Create canonical request for AWS4 signature
   */
  createCanonicalRequest(method, objectKey, headers, payloadHash) {
    // Sort headers alphabetically
    const sortedHeaders = Object.keys(headers).sort();
    
    const canonicalHeaders = sortedHeaders
      .map(key => `${key.toLowerCase()}:${headers[key]}`)
      .join('\n');

    const signedHeaders = sortedHeaders
      .map(key => key.toLowerCase())
      .join(';');

    return [
      method,
      `/${objectKey}`,
      '',
      canonicalHeaders,
      '',
      signedHeaders,
      payloadHash
    ].join('\n');
  }

  /**
   * Upload file to DigitalOcean Spaces using streaming for better performance
   */
  async uploadFile(filePath, objectKey, contentType = 'audio/mpeg', acl = 'public-read', onProgress = null) {
    try {
      if (!this.endpoint || !this.bucket || !this.region || !this.accessKey || !this.secretKey) {
        throw new Error('DigitalOcean Spaces configuration incomplete');
      }

      // ✅ GET FILE SIZE WITHOUT LOADING INTO MEMORY
      const fileStats = fs.statSync(filePath);
      const fileSize = fileStats.size;
      
      const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
      const date = timestamp.slice(0, 8);

      // ✅ CREATE FILE STREAM FOR HASH CALCULATION
      const hashStream = fs.createReadStream(filePath);
      const payloadHash = await this.calculateStreamHash(hashStream);

      // ✅ CREATE UPLOAD STREAM
      const uploadStream = fs.createReadStream(filePath);

      // Create headers
      const headers = {
        'Content-Length': fileSize.toString(),
        'Content-Type': contentType,
        'Host': `${this.bucket}.${this.endpoint}`,
        'x-amz-acl': acl,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': timestamp
      };

      // Create canonical request
      const canonicalRequest = this.createCanonicalRequest('PUT', objectKey, headers, payloadHash);
      
      // Create string to sign
      const stringToSign = [
        'AWS4-HMAC-SHA256',
        timestamp,
        `${date}/${this.region}/s3/aws4_request`,
        crypto.createHash('sha256').update(canonicalRequest).digest('hex')
      ].join('\n');

      // Generate signature
      const signature = this.generateSignature(stringToSign, date, this.region);
      
      // Create authorization header
      const signedHeaders = Object.keys(headers).sort().map(key => key.toLowerCase()).join(';');
      const authorization = `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${date}/${this.region}/s3/aws4_request,SignedHeaders=${signedHeaders},Signature=${signature}`;

      // Upload file
      const url = `https://${this.bucket}.${this.endpoint}/${objectKey}`;
      
      logger.info('Uploading file to DigitalOcean Spaces using streaming', {
        objectKey,
        fileSize,
        bucket: this.bucket,
        region: this.region
      });

      // ✅ TRACK UPLOAD PROGRESS
      let uploadedBytes = 0;
      uploadStream.on('data', (chunk) => {
        uploadedBytes += chunk.length;
        if (onProgress) {
          onProgress(uploadedBytes, fileSize);
        }
      });

      // ✅ SEND STREAM INSTEAD OF BUFFER
      const response = await axios.put(url, uploadStream, {
        headers: {
          ...headers,
          'Authorization': authorization
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            onProgress(progressEvent.loaded, progressEvent.total);
          }
        }
      });

      if (response.status === 200) {
        const fileUrl = `https://${this.bucket}.${this.endpoint}/${objectKey}`;
        logger.info('File uploaded successfully using streaming', { objectKey, fileSize });
        return fileUrl;
      } else {
        throw new Error(`Upload failed with status: ${response.status}`);
      }

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
   * Calculate hash from stream without loading entire file into memory
   */
  async calculateStreamHash(stream) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Delete file from DigitalOcean Spaces
   */
  async deleteFile(objectKey) {
    try {
      if (!this.endpoint || !this.bucket || !this.region || !this.accessKey || !this.secretKey) {
        throw new Error('DigitalOcean Spaces configuration incomplete');
      }

      const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
      const date = timestamp.slice(0, 8);
      const payloadHash = crypto.createHash('sha256').update('').digest('hex');

      // Create headers for DELETE request
      const headers = {
        'Host': `${this.bucket}.${this.endpoint}`,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': timestamp
      };

      // Create canonical request
      const canonicalRequest = this.createCanonicalRequest('DELETE', objectKey, headers, payloadHash);
      
      // Create string to sign
      const stringToSign = [
        'AWS4-HMAC-SHA256',
        timestamp,
        `${date}/${this.region}/s3/aws4_request`,
        crypto.createHash('sha256').update(canonicalRequest).digest('hex')
      ].join('\n');

      // Generate signature
      const signature = this.generateSignature(stringToSign, date, this.region);
      
      // Create authorization header
      const signedHeaders = Object.keys(headers).sort().map(key => key.toLowerCase()).join(';');
      const authorization = `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${date}/${this.region}/s3/aws4_request,SignedHeaders=${signedHeaders},Signature=${signature}`;

      // Delete file
      const url = `https://${this.bucket}.${this.endpoint}/${objectKey}`;
      
      logger.info('Deleting file from DigitalOcean Spaces', { objectKey });

      const response = await axios.delete(url, {
        headers: {
          ...headers,
          'Authorization': authorization
        }
      });

      if (response.status === 204) {
        logger.info('File deleted successfully from DigitalOcean Spaces', { objectKey });
        return true;
      } else {
        throw new Error(`Delete failed with status: ${response.status}`);
      }

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
   * Extract object key from file URL
   */
  getObjectKeyFromUrl(fileUrl) {
    if (!this.bucket || !this.endpoint) {
      throw new Error('DigitalOcean Spaces configuration incomplete');
    }
    const baseUrl = `https://${this.bucket}.${this.endpoint}/`;
    if (fileUrl.startsWith(baseUrl)) {
      return fileUrl.replace(baseUrl, '');
    }
    return null;
  }

  /**
   * Check if service is properly configured
   */
  isConfigured() {
    return !!(this.endpoint && this.bucket && this.region && this.accessKey && this.secretKey);
  }
}

module.exports = new SpacesService();
