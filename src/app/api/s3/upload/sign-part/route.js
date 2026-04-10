import { UploadPartCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getSystemS3Client, getRequestContext, errorResponse, successResponse } from '@/lib/s3';

export async function POST(request) {
  const context = await getRequestContext();
  if (context.error) return errorResponse(context.error, context.status);

  try {
    const body = await request.json();
    const { key, uploadId, partNumber } = body;
    // Note: the `key` here is the *absoluteKey* returned from our `initiate` endpoint.

    if (!key || !uploadId || !partNumber) {
      return errorResponse('key, uploadId, and partNumber are required');
    }

    const s3 = getSystemS3Client();

    const command = new UploadPartCommand({
      Bucket: context.bucket,
      Key: key, // already absolute
      UploadId: uploadId,
      PartNumber: partNumber,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return successResponse({ url, partNumber });
  } catch (error) {
    console.error('S3 Sign Part Error:', error);
    return errorResponse(error.message || 'Failed to sign part', 500);
  }
}
