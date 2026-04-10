import { AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import { getSystemS3Client, getRequestContext, errorResponse, successResponse } from '@/lib/s3';

export async function POST(request) {
  const context = await getRequestContext();
  if (context.error) return errorResponse(context.error, context.status);

  try {
    const body = await request.json();
    const { key, uploadId } = body;
    // Note: the `key` here is the *absoluteKey* returned from our `initiate` endpoint.

    if (!key || !uploadId) {
      return errorResponse('key and uploadId are required');
    }

    const s3 = getSystemS3Client();

    await s3.send(new AbortMultipartUploadCommand({
      Bucket: context.bucket,
      Key: key, // already absolute
      UploadId: uploadId,
    }));

    return successResponse({ aborted: true });
  } catch (error) {
    console.error('S3 Abort Upload Error:', error);
    return errorResponse(error.message || 'Failed to abort upload', 500);
  }
}
