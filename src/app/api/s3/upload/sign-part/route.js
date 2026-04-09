import { UploadPartCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3Client, extractCredentials, errorResponse, successResponse } from '@/lib/s3';

export async function POST(request) {
  const credentials = extractCredentials(request);
  if (!credentials) {
    return errorResponse('Missing credentials', 401);
  }

  try {
    const body = await request.json();
    const { key, uploadId, partNumber } = body;

    if (!key || !uploadId || !partNumber) {
      return errorResponse('key, uploadId, and partNumber are required');
    }

    const s3 = createS3Client(credentials);

    const command = new UploadPartCommand({
      Bucket: credentials.bucket,
      Key: key,
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
