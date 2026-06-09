import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;

export async function getObject<T>(key: string, fallback: T): Promise<T> {
  try {
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const res = await client.send(cmd);
    const body = await res.Body?.transformToString();
    return body ? JSON.parse(body) : fallback;
  } catch {
    return fallback;
  }
}

export async function putObject(key: string, data: unknown): Promise<void> {
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: JSON.stringify(data),
    ContentType: "application/json",
  });
  await client.send(cmd);
}
