import { CopyObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSystemS3Client, getRequestContext, errorResponse, successResponse } from '@/lib/s3';

export async function POST(request) {
  const context = await getRequestContext();
  if (context.error) return errorResponse(context.error, context.status);

  try {
    const body = await request.json();
    const { source, destination } = body;

    if (!source || !destination) {
      return errorResponse('Source and destination are required');
    }

    const s3 = getSystemS3Client();
    const bucket = context.bucket;
    const absoluteSource = context.userPrefix + source;
    const absoluteDest = context.userPrefix + destination;

    // Check if source is a "folder" (prefix)
    const isFolder = source.endsWith('/');

    if (isFolder) {
      // Move all objects under this prefix
      let continuationToken;
      let moved = 0;
      do {
        const listResponse = await s3.send(new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: absoluteSource,
          ContinuationToken: continuationToken,
        }));

        for (const obj of (listResponse.Contents || [])) {
          const newKey = absoluteDest + obj.Key.slice(absoluteSource.length);

          await s3.send(new CopyObjectCommand({
            Bucket: bucket,
            // S3 CopySource requires encoding, BUT slashes should not be encoded or it breaks if folders are deep
            CopySource: `${bucket}/${obj.Key.split('/').map(encodeURIComponent).join('/')}`,
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
        CopySource: `${bucket}/${absoluteSource.split('/').map(encodeURIComponent).join('/')}`,
        Key: absoluteDest,
      }));

      await s3.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: absoluteSource,
      }));

      return successResponse({ moved: 1 });
    }
  } catch (error) {
    console.error('S3 Move Error:', error);
    return errorResponse(error.message || 'Failed to move', 500);
  }
}
