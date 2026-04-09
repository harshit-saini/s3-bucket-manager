import { S3Client } from '@aws-sdk/client-s3';

/**
 * Create an S3 client from credentials object
 */
export function createS3Client(credentials) {
  const config = {
    region: credentials.region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  };

  // Support custom endpoints (MinIO, R2, DigitalOcean Spaces, etc.)
  if (credentials.endpoint) {
    config.endpoint = credentials.endpoint;
    config.forcePathStyle = true; // Required for most S3-compatible services
  }

  return new S3Client(config);
}

/**
 * Extract credentials from request headers
 */
export function extractCredentials(request) {
  const accessKeyId = request.headers.get('x-s3-access-key-id');
  const secretAccessKey = request.headers.get('x-s3-secret-access-key');
  const region = request.headers.get('x-s3-region');
  const bucket = request.headers.get('x-s3-bucket');
  const endpoint = request.headers.get('x-s3-endpoint') || '';

  if (!accessKeyId || !secretAccessKey || !region || !bucket) {
    return null;
  }

  return { accessKeyId, secretAccessKey, region, bucket, endpoint };
}

/**
 * Create error response
 */
export function errorResponse(message, status = 400) {
  return Response.json({ error: message }, { status });
}

/**
 * Create success response
 */
export function successResponse(data, status = 200) {
  return Response.json(data, { status });
}
