import { CreateMultipartUploadCommand } from '@aws-sdk/client-s3';
import { getSystemS3Client, getRequestContext, errorResponse, successResponse } from '@/lib/s3';
import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';

export async function POST(request) {
  const context = await getRequestContext();
  if (context.error) return errorResponse(context.error, context.status);

  try {
    const body = await request.json();
    const { key, size, contentType } = body;

    if (!key) {
      return errorResponse('Key is required');
    }

    if (!size || isNaN(size)) {
       return errorResponse('File size is required for quota validation', 400);
    }

    // Quota Enforcement — upsert user so it's auto-created if the webhook hasn't fired yet
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress || '';

    const userDb = await db.user.upsert({
      where: { id: context.userId },
      create: {
        id: context.userId,
        email: email,
        storageUsed: BigInt(0),
        storageLimit: BigInt(1073741824), // 1 GB default
        plan: 'FREE',
      },
      update: {},
    });

    if (BigInt(userDb.storageUsed) + BigInt(size) > BigInt(userDb.storageLimit)) {
      return errorResponse('Storage quota exceeded. Please upgrade your plan to upload more files.', 402);
    }

    const s3 = getSystemS3Client();
    const absoluteKey = context.userPrefix + key;

    const command = new CreateMultipartUploadCommand({
      Bucket: context.bucket,
      Key: absoluteKey,
      ContentType: contentType || 'application/octet-stream',
    });

    const response = await s3.send(command);

    return successResponse({
      uploadId: response.UploadId,
      key: absoluteKey, // Return absolute key so subsequent sign/complete requests use the exact scoped key
    });
  } catch (error) {
    console.error('S3 Upload Initiate Error:', error);
    return errorResponse(error.message || 'Failed to initiate upload', 500);
  }
}
