import "server-only";
import { randomUUID } from "crypto";
import { mkdir, rename, rmdir, unlink, writeFile } from "fs/promises";
import path from "path";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { env } from "~/env";

let s3Client: S3Client | undefined;

function getS3Client() {
  if (s3Client) return s3Client;
  if (
    !env.STORAGE_BUCKET ||
    !env.STORAGE_ACCESS_KEY_ID ||
    !env.STORAGE_SECRET_ACCESS_KEY ||
    !env.STORAGE_PUBLIC_URL
  ) {
    throw new Error(
      "S3 storage is selected but its bucket, credentials, or public URL are incomplete.",
    );
  }
  s3Client = new S3Client({
    region: env.STORAGE_REGION,
    endpoint: env.STORAGE_ENDPOINT,
    forcePathStyle: Boolean(env.STORAGE_ENDPOINT),
    credentials: {
      accessKeyId: env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
    },
  });
  return s3Client;
}

export async function storeMedia(input: {
  key: string;
  buffer: Buffer;
  contentType: string;
}) {
  if (env.STORAGE_DRIVER === "s3") {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: env.STORAGE_BUCKET!,
        Key: input.key,
        Body: input.buffer,
        ContentType: input.contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return `${env.STORAGE_PUBLIC_URL!.replace(/\/$/, "")}/${input.key}`;
  }
  const target = path.join(process.cwd(), "public", input.key);
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, input.buffer, { flag: "wx" });
    await rename(temporary, target);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
  return `/${input.key}`;
}

export async function removeMedia(key: string) {
  if (env.STORAGE_DRIVER === "s3") {
    await getS3Client().send(
      new DeleteObjectCommand({ Bucket: env.STORAGE_BUCKET!, Key: key }),
    );
    return;
  }
  const uploadRoot = path.join(process.cwd(), "public", "uploads");
  const target = path.join(process.cwd(), "public", key);
  if (!target.startsWith(`${uploadRoot}${path.sep}`))
    throw new Error("Unsafe media path.");
  await unlink(target).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
  await rmdir(path.dirname(target)).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT" && error.code !== "ENOTEMPTY") throw error;
  });
}
