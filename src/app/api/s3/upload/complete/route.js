import { CompleteMultipartUploadCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSystemS3Client, getRequestContext, errorResponse, successResponse } from '@/lib/s3';
import { db } from '@/lib/db';

export async function POST(request) {
  const context = await getRequestContext();
  if (context.error) return errorResponse(context.error, context.status);

  try {
    const body = await request.json();
    const { key, uploadId, parts } = body;
    // Note: the `key` here is the *absoluteKey* returned from our `initiate` endpoint.

    if (!key || !uploadId || !parts) {
      return errorResponse('key, uploadId, and parts are required');
    }

    const s3 = getSystemS3Client();

    const command = new CompleteMultipartUploadCommand({
      Bucket: context.bucket,
      Key: key, // absolute key
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map(part => ({
          PartNumber: part.PartNumber || part.partNumber,
          ETag: part.ETag || part.etag,
        })),
      },
    });

    const response = await s3.send(command);

    // After success, fetch the final file size to accurately account for quota in the DB
    try {
      const headRes = await s3.send(new HeadObjectCommand({ Bucket: context.bucket, Key: key }));
      const finalSize = headRes.ContentLength || 0;
      
      await db.user.update({
        where: { id: context.userId },
        data: {
          storageUsed: { increment: finalSize }
        }
      });
    } catch (e) {
      console.error('Failed to update DB quota after successful upload', e);
    }

    return successResponse({
      location: response.Location,
      key: key.replace(context.userPrefix, ''), // translate back to local scope
      etag: response.ETag,
    });
  } catch (error) {
    console.error('S3 Complete Upload Error:', error);
    return errorResponse(error.message || 'Failed to complete upload', 500);
  }
}
