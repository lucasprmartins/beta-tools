import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface StorageConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

let client: S3Client | null = null;
let currentConfig: StorageConfig | null = null;

function getClient(config: StorageConfig): S3Client {
  if (client && currentConfig === config) {
    return client;
  }

  client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  currentConfig = config;
  return client;
}

export async function gerarUrlUpload(
  config: StorageConfig,
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
  });
  return await getSignedUrl(getClient(config), command, { expiresIn });
}

export async function gerarUrlDownload(
  config: StorageConfig,
  key: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });
  return await getSignedUrl(getClient(config), command, { expiresIn });
}

export async function removerObjeto(
  config: StorageConfig,
  key: string
): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });
  await getClient(config).send(command);
}

export async function listarObjetos(
  config: StorageConfig,
  prefix?: string
): Promise<ListObjectsV2CommandOutput> {
  const command = new ListObjectsV2Command({
    Bucket: config.bucket,
    Prefix: prefix,
  });
  return await getClient(config).send(command);
}
