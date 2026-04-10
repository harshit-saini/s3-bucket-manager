import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getSystemS3Client, getRequestContext, errorResponse, successResponse } from '@/lib/s3';

export async function GET(request) {
  const context = await getRequestContext();
  if (context.error) return errorResponse(context.error, context.status);

  const { searchParams } = new URL(request.url);
  const relativeKey = searchParams.get('key');

  if (!relativeKey) {
    return errorResponse('Key is required');
  }

  const absoluteKey = context.userPrefix + relativeKey;

  try {
    const s3 = getSystemS3Client();

    const command = new GetObjectCommand({
      Bucket: context.bucket,
      Key: absoluteKey,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return successResponse({ url });
  } catch (error) {
    console.error('S3 Preview Error:', error);
    return errorResponse(error.message || 'Failed to generate preview URL', 500);
  }
}
