import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3Client, extractCredentials, errorResponse, successResponse } from '@/lib/s3';

export async function GET(request) {
  const credentials = extractCredentials(request);
  if (!credentials) {
    return errorResponse('Missing credentials', 401);
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key) {
    return errorResponse('Key is required');
  }

  try {
    const s3 = createS3Client(credentials);

    const command = new GetObjectCommand({
      Bucket: credentials.bucket,
      Key: key,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return successResponse({ url });
  } catch (error) {
    console.error('S3 Preview Error:', error);
    return errorResponse(error.message || 'Failed to generate preview URL', 500);
  }
}
