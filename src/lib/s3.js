import { S3Client } from '@aws-sdk/client-s3';
import { auth } from '@clerk/nextjs/server';

/**
 * Get S3 Client from central .env credentials
 */
export function getSystemS3Client() {
  const config = {
    region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
    },
  };

  if (process.env.S3_ENDPOINT || process.env.AWS_S3_ENDPOINT) {
    config.endpoint = process.env.S3_ENDPOINT || process.env.AWS_S3_ENDPOINT;
    config.forcePathStyle = true;
  }

  return new S3Client(config);
}

/**
 * Get bucket details from system and authenticate user
 */
export async function getRequestContext() {
  // 1. Authenticate user via Clerk
  const { userId } = await auth();
  if (!userId) {
    return { error: 'Unauthorized', status: 401 };
  }

  // 2. Validate system bucket config
  const bucket = process.env.S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME;
  if (!(process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID) || !bucket) {
    return { error: 'System S3 not configured', status: 500 };
  }

  // Force all paths for this user into their specific virtual folder
  const userPrefix = `users/${userId}/`;
  
  return { userId, bucket, userPrefix };
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
