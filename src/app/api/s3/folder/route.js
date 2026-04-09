import { PutObjectCommand } from '@aws-sdk/client-s3';
import { createS3Client, extractCredentials, errorResponse, successResponse } from '@/lib/s3';

export async function POST(request) {
  const credentials = extractCredentials(request);
  if (!credentials) {
    return errorResponse('Missing credentials', 401);
  }

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

    const s3 = createS3Client(credentials);

    await s3.send(new PutObjectCommand({
      Bucket: credentials.bucket,
      Key: path,
      Body: '',
      ContentLength: 0,
    }));

    return successResponse({ created: path });
  } catch (error) {
    console.error('S3 Create Folder Error:', error);
    return errorResponse(error.message || 'Failed to create folder', 500);
  }
}
