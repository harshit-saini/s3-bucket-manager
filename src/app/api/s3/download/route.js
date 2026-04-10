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
    const fileName = relativeKey.split('/').pop() || 'download';

    const command = new GetObjectCommand({
      Bucket: context.bucket,
      Key: absoluteKey,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return successResponse({ url });
  } catch (error) {
    console.error('S3 Download Error:', error);
    return errorResponse(error.message || 'Failed to generate download URL', 500);
  }
}
