import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';

export const BUCKET = 'langlearn-docs';

const ALLOWED_PREFIXES = ['uploads/', 'chunks/'];

const s3 = new S3Client({ region: 'us-east-1' });

export async function uploadToS3(
  key: string,
  body: Buffer | string,
  contentType: string
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function getFromS3(key: string): Promise<Buffer> {
  const response = await s3.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key })
  );
  const stream = response.Body;
  if (!stream) throw new Error(`S3 object empty: ${key}`);
  return Buffer.from(await stream.transformToByteArray());
}

export async function deleteS3Prefix(prefix: string): Promise<void> {
  if (!ALLOWED_PREFIXES.some((p) => prefix.startsWith(p))) {
    throw new Error(`Refusing to delete unsafe prefix: ${prefix}`);
  }

  let continuationToken: string | undefined;
  do {
    const list = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      })
    );

    const objects = list.Contents;
    if (!objects || objects.length === 0) break;

    await s3.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: {
          Objects: objects.map((obj) => ({ Key: obj.Key })),
          Quiet: true,
        },
      })
    );

    continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (continuationToken);
}
