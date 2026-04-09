import { AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import { createS3Client, extractCredentials, errorResponse, successResponse } from '@/lib/s3';

export async function POST(request) {
  const credentials = extractCredentials(request);
  if (!credentials) {
    return errorResponse('Missing credentials', 401);
  }

  try {
    const body = await request.json();
    const { key, uploadId } = body;

    if (!key || !uploadId) {
      return errorResponse('key and uploadId are required');
    }

    const s3 = createS3Client(credentials);

    await s3.send(new AbortMultipartUploadCommand({
      Bucket: credentials.bucket,
      Key: key,
      UploadId: uploadId,
    }));

    return successResponse({ aborted: true });
  } catch (error) {
    console.error('S3 Abort Upload Error:', error);
    return errorResponse(error.message || 'Failed to abort upload', 500);
  }
}
