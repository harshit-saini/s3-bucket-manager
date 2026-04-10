import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSystemS3Client, getRequestContext, errorResponse, successResponse } from '@/lib/s3';

export async function POST(request) {
  const context = await getRequestContext();
  if (context.error) return errorResponse(context.error, context.status);

  try {
    const body = await request.json();
    let { path } = body;

    if (!path) {
      return errorResponse('Path is required');
    }

    // Ensure path ends with /
    if (!path.endsWith('/')) {
      path += '/';
    }

    const absolutePath = context.userPrefix + path;

    const s3 = getSystemS3Client();

    await s3.send(new PutObjectCommand({
      Bucket: context.bucket,
      Key: absolutePath,
      Body: '',
      ContentLength: 0,
    }));

    return successResponse({ created: path });
  } catch (error) {
    console.error('S3 Create Folder Error:', error);
    return errorResponse(error.message || 'Failed to create folder', 500);
  }
}
