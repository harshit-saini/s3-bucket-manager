import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSystemS3Client, getRequestContext, errorResponse, successResponse } from '@/lib/s3';

export async function GET(request) {
  const context = await getRequestContext();
  if (context.error) return errorResponse(context.error, context.status);

  const { searchParams } = new URL(request.url);
  const relativePrefix = searchParams.get('prefix') || '';
  const continuationToken = searchParams.get('continuationToken') || undefined;
  const maxKeys = parseInt(searchParams.get('maxKeys') || '500', 10);

  // Securely construct the absolute prefix mapping to the user's folder
  const absolutePrefix = context.userPrefix + relativePrefix;

  try {
    const s3 = getSystemS3Client();
    const command = new ListObjectsV2Command({
      Bucket: context.bucket,
      Prefix: absolutePrefix,
      Delimiter: '/',
      MaxKeys: maxKeys,
      ContinuationToken: continuationToken,
    });

    const response = await s3.send(command);

    // Map the absolute prefixes back to relative paths for the frontend
    const folders = (response.CommonPrefixes || []).map(p => {
      const relPath = p.Prefix.replace(context.userPrefix, '');
      return {
        prefix: relPath,
        name: p.Prefix.replace(absolutePrefix, '').replace(/\/$/, ''),
      };
    });

    const files = (response.Contents || [])
      .filter(obj => obj.Key !== absolutePrefix) // exclude the prefix marker itself
      .map(obj => {
        const relPath = obj.Key.replace(context.userPrefix, '');
        return {
          key: relPath,
          name: obj.Key.replace(absolutePrefix, ''),
          size: obj.Size,
          lastModified: obj.LastModified?.toISOString(),
          etag: obj.ETag,
          storageClass: obj.StorageClass,
        };
      });

    return successResponse({
      folders,
      files,
      nextToken: response.NextContinuationToken || null,
      isTruncated: response.IsTruncated || false,
      keyCount: response.KeyCount || 0,
    });
  } catch (error) {
    console.error('S3 List Error:', error);
    return errorResponse(error.message || 'Failed to list objects', 500);
  }
}
