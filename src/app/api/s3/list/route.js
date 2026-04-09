import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createS3Client, extractCredentials, errorResponse, successResponse } from '@/lib/s3';

export async function GET(request) {
  const credentials = extractCredentials(request);
  if (!credentials) {
    return errorResponse('Missing credentials', 401);
  }

  const { searchParams } = new URL(request.url);
  const prefix = searchParams.get('prefix') || '';
  const continuationToken = searchParams.get('continuationToken') || undefined;
  const maxKeys = parseInt(searchParams.get('maxKeys') || '500', 10);

  try {
    const s3 = createS3Client(credentials);
    const command = new ListObjectsV2Command({
      Bucket: credentials.bucket,
      Prefix: prefix,
      Delimiter: '/',
      MaxKeys: maxKeys,
      ContinuationToken: continuationToken,
    });

    const response = await s3.send(command);

    const folders = (response.CommonPrefixes || []).map(p => ({
      prefix: p.Prefix,
      name: p.Prefix.replace(prefix, '').replace(/\/$/, ''),
    }));

    const files = (response.Contents || [])
      .filter(obj => obj.Key !== prefix) // exclude the prefix itself
      .map(obj => ({
        key: obj.Key,
        name: obj.Key.replace(prefix, ''),
        size: obj.Size,
        lastModified: obj.LastModified?.toISOString(),
        etag: obj.ETag,
        storageClass: obj.StorageClass,
      }));

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
