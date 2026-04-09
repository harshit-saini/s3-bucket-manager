import { CompleteMultipartUploadCommand } from '@aws-sdk/client-s3';
import { createS3Client, extractCredentials, errorResponse, successResponse } from '@/lib/s3';

export async function POST(request) {
  const credentials = extractCredentials(request);
  if (!credentials) {
    return errorResponse('Missing credentials', 401);
  }

  try {
    const body = await request.json();
    const { key, uploadId, parts } = body;

    if (!key || !uploadId || !parts) {
      return errorResponse('key, uploadId, and parts are required');
    }

    const s3 = createS3Client(credentials);

    const command = new CompleteMultipartUploadCommand({
      Bucket: credentials.bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map(part => ({
          PartNumber: part.PartNumber || part.partNumber,
          ETag: part.ETag || part.etag,
        })),
      },
    });

    const response = await s3.send(command);

    return successResponse({
      location: response.Location,
      key: response.Key,
      etag: response.ETag,
    });
  } catch (error) {
    console.error('S3 Complete Upload Error:', error);
    return errorResponse(error.message || 'Failed to complete upload', 500);
  }
}
