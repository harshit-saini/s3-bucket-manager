import { DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { createS3Client, extractCredentials, errorResponse, successResponse } from '@/lib/s3';

export async function POST(request) {
  const credentials = extractCredentials(request);
  if (!credentials) {
    return errorResponse('Missing credentials', 401);
  }

  try {
    const body = await request.json();
    const { keys } = body;

    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return errorResponse('No keys provided');
    }

    const s3 = createS3Client(credentials);

    if (keys.length === 1) {
      await s3.send(new DeleteObjectCommand({
        Bucket: credentials.bucket,
        Key: keys[0],
      }));
    } else {
      // Batch delete (max 1000 per request)
      const batches = [];
      for (let i = 0; i < keys.length; i += 1000) {
        batches.push(keys.slice(i, i + 1000));
      }

      for (const batch of batches) {
        await s3.send(new DeleteObjectsCommand({
          Bucket: credentials.bucket,
          Delete: {
            Objects: batch.map(key => ({ Key: key })),
            Quiet: true,
          },
        }));
      }
    }

    return successResponse({ deleted: keys.length });
  } catch (error) {
    console.error('S3 Delete Error:', error);
    return errorResponse(error.message || 'Failed to delete', 500);
  }
}
