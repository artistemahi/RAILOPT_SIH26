import {
  CreateBucketCommand,
  type BucketLocationConstraint,
  HeadBucketCommand,
  HeadObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { config } from "../config/env.js";

const client = new S3Client({
  endpoint: config.minioEndpoint,
  region: config.minioRegion,
  forcePathStyle: true,
  credentials: {
    accessKeyId: config.minioAccessKey,
    secretAccessKey: config.minioSecretKey,
  },
});

export async function objectExists(objectKey: string): Promise<boolean> {
  try {
    await client.send(
      new HeadObjectCommand({ Bucket: config.minioBucket, Key: objectKey }),
    );
    return true;
  } catch {
    return false;
  }
}

export async function uploadObject(
  objectKey: string,
  body: string | Uint8Array,
  contentType = "application/octet-stream",
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: config.minioBucket,
      Key: objectKey,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getObject(objectKey: string): Promise<Buffer> {
  const result = await client.send(
    new GetObjectCommand({ Bucket: config.minioBucket, Key: objectKey }),
  );

  if (!result.Body) {
    return Buffer.alloc(0);
  }

  return Buffer.from(await result.Body.transformToByteArray());
}

async function ensureBucket(): Promise<void> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: config.minioBucket }));
  } catch {
    await client.send(
      new CreateBucketCommand({
        Bucket: config.minioBucket,
        CreateBucketConfiguration: {
          LocationConstraint: config.minioRegion as BucketLocationConstraint,
        },
      }),
    );
  }
}

export async function testObjectStorage(): Promise<{
  available: boolean;
  bucket: string;
  objectKey: string;
  retrievedValue: string | null;
}> {
  const objectKey = "health/minio-test.txt";
  const value = "RAILOPT MinIO health check";

  await ensureBucket();
  await uploadObject(objectKey, value, "text/plain; charset=utf-8");
  const exists = await objectExists(objectKey);
  const retrievedValue = exists
    ? (await getObject(objectKey)).toString("utf8")
    : null;

  return {
    available: retrievedValue === value,
    bucket: config.minioBucket,
    objectKey,
    retrievedValue,
  };
}
