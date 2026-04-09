import { CreateMultipartUploadCommand } from '@aws-sdk/client-s3';
import { createS3Client, extractCredentials, errorResponse, successResponse } from '@/lib/s3';

export async function POST(request) {
  const credentials = extractCredentials(request);
  if (!credentials) {
    return errorResponse('Missing credentials', 401);
  }

  try {
    const body = await request.json();
    const { key, contentType } = body;

    if (!key) {
      return errorResponse('Key is required');
    }

    const s3 = createS3Client(credentials);

    const command = new CreateMultipartUploadCommand({
      Bucket: credentials.bucket,
      Key: key,
      ContentType: contentType || 'application/octet-stream',
    });

    const response = await s3.send(command);

    return successResponse({
      uploadId: response.UploadId,
      key: response.Key,
    });
  } catch (error) {
    console.error('S3 Upload Initiate Error:', error);
    return errorResponse(error.message || 'Failed to initiate upload', 500);
  }
}
