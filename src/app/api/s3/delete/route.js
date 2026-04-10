import { DeleteObjectCommand, DeleteObjectsCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSystemS3Client, getRequestContext, errorResponse, successResponse } from '@/lib/s3';
import { db } from '@/lib/db';

export async function POST(request) {
  const context = await getRequestContext();
  if (context.error) return errorResponse(context.error, context.status);

  try {
    const body = await request.json();
    const { keys } = body;

    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return errorResponse('No keys provided');
    }

    const s3 = getSystemS3Client();
    const absoluteKeys = keys.map(k => context.userPrefix + k);

    // Calculate total size to free up from the database quota
    let totalFreedBytes = 0;
    try {
      const sizes = await Promise.all(
        absoluteKeys.map(async (k) => {
          if (k.endsWith('/')) return 0;
          try {
            const head = await s3.send(new HeadObjectCommand({ Bucket: context.bucket, Key: k }));
            return head.ContentLength || 0;
          } catch {
            return 0;
          }
        })
      );
      totalFreedBytes = sizes.reduce((a, b) => a + b, 0);
    } catch (e) {
      console.error('Failed to calculate deleted file sizes', e);
    }

    if (absoluteKeys.length === 1) {
      await s3.send(new DeleteObjectCommand({
        Bucket: context.bucket,
        Key: absoluteKeys[0],
      }));
    } else {
      const batches = [];
      for (let i = 0; i < absoluteKeys.length; i += 1000) {
        batches.push(absoluteKeys.slice(i, i + 1000));
      }

      for (const batch of batches) {
        await s3.send(new DeleteObjectsCommand({
          Bucket: context.bucket,
          Delete: {
            Objects: batch.map(key => ({ Key: key })),
            Quiet: true,
          },
        }));
      }
    }

    // Update database quota space
    if (totalFreedBytes > 0) {
      await db.user.update({
        where: { id: context.userId },
        data: {
          storageUsed: { decrement: totalFreedBytes }
        }
      }).catch(e => console.error('Failed to update DB quota after delete', e));
    }

    return successResponse({ deleted: keys.length });
  } catch (error) {
    console.error('S3 Delete Error:', error);
    return errorResponse(error.message || 'Failed to delete', 500);
  }
}
