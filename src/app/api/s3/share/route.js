import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3Client, extractCredentials, errorResponse, successResponse } from '@/lib/s3';

export async function POST(request) {
  const credentials = extractCredentials(request);
  if (!credentials) {
    return errorResponse('Missing credentials', 401);
  }

  try {
    const body = await request.json();
    const { key, expiresIn } = body;

    if (!key) {
      return errorResponse('Key is required');
    }

    // Default to 24 hours, max 7 days (604800 seconds)
    const ttl = Math.min(Math.max(parseInt(expiresIn || '86400', 10), 60), 604800);

    const s3 = createS3Client(credentials);

    const command = new GetObjectCommand({
      Bucket: credentials.bucket,
      Key: key,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: ttl });

    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

    return successResponse({ url, expiresAt, expiresIn: ttl });
  } catch (error) {
    console.error('S3 Share Error:', error);
    return errorResponse(error.message || 'Failed to generate share URL', 500);
  }
}
