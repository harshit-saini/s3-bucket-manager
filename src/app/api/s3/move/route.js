import { CopyObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createS3Client, extractCredentials, errorResponse, successResponse } from '@/lib/s3';

export async function POST(request) {
  const credentials = extractCredentials(request);
  if (!credentials) {
    return errorResponse('Missing credentials', 401);
  }

  try {
    const body = await request.json();
    const { source, destination } = body;

    if (!source || !destination) {
      return errorResponse('Source and destination are required');
    }

    const s3 = createS3Client(credentials);
    const bucket = credentials.bucket;

    // Check if source is a "folder" (prefix)
    const isFolder = source.endsWith('/');

    if (isFolder) {
      // Move all objects under this prefix
      let continuationToken;
      let moved = 0;
      do {
        const listResponse = await s3.send(new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: source,
          ContinuationToken: continuationToken,
        }));

        for (const obj of (listResponse.Contents || [])) {
          const newKey = destination + obj.Key.slice(source.length);

          await s3.send(new CopyObjectCommand({
            Bucket: bucket,
            CopySource: `${bucket}/${encodeURIComponent(obj.Key)}`,
            Key: newKey,
          }));

          await s3.send(new DeleteObjectCommand({
            Bucket: bucket,
            Key: obj.Key,
          }));

          moved++;
        }

        continuationToken = listResponse.NextContinuationToken;
      } while (continuationToken);

      return successResponse({ moved });
    } else {
      // Move single file
      await s3.send(new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${encodeURIComponent(source)}`,
        Key: destination,
      }));

      await s3.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: source,
      }));

      return successResponse({ moved: 1 });
    }
  } catch (error) {
    console.error('S3 Move Error:', error);
    return errorResponse(error.message || 'Failed to move', 500);
  }
}
