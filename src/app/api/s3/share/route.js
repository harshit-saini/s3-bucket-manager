import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getSystemS3Client, getRequestContext, errorResponse, successResponse } from '@/lib/s3';

export async function POST(request) {
  const context = await getRequestContext();
  if (context.error) return errorResponse(context.error, context.status);

  try {
    const body = await request.json();
    const { key, expiresIn } = body;

    if (!key) {
      return errorResponse('Key is required');
    }

    const ttl = Math.min(Math.max(parseInt(expiresIn || '86400', 10), 60), 604800);

    const s3 = getSystemS3Client();
    const absoluteKey = context.userPrefix + key;

    const command = new GetObjectCommand({
      Bucket: context.bucket,
      Key: absoluteKey,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: ttl });

    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

    return successResponse({ url, expiresAt, expiresIn: ttl });
  } catch (error) {
    console.error('S3 Share Error:', error);
    return errorResponse(error.message || 'Failed to generate share URL', 500);
  }
}
