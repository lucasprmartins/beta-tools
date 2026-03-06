import { S3Client } from "bun";

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
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    bucket: config.bucket,
  });

  currentConfig = config;
  return client;
}

export function gerarUrlUpload(
  config: StorageConfig,
  key: string,
  contentType: string,
  expiresIn = 3600
): string {
  return getClient(config).presign(key, {
    method: "PUT",
    expiresIn,
    type: contentType,
  });
}

export function gerarUrlDownload(
  config: StorageConfig,
  key: string,
  expiresIn = 3600
): string {
  return getClient(config).presign(key, {
    method: "GET",
    expiresIn,
  });
}

export async function removerObjeto(
  config: StorageConfig,
  key: string
): Promise<void> {
  await getClient(config).delete(key);
}

export async function uploadObjeto(
  config: StorageConfig,
  key: string,
  data: Blob | ArrayBuffer | string,
  contentType?: string
): Promise<void> {
  const s3 = getClient(config);
  await s3.write(key, data, { type: contentType });
}

export function downloadObjeto(config: StorageConfig, key: string): Response {
  const s3file = getClient(config).file(key);
  return new Response(s3file);
}

export async function existeObjeto(
  config: StorageConfig,
  key: string
): Promise<boolean> {
  return await getClient(config).file(key).exists();
}

export async function tamanhoObjeto(
  config: StorageConfig,
  key: string
): Promise<number> {
  return await getClient(config).file(key).size;
}

export interface ListResult {
  contents: { key: string; lastModified: string; size: number }[];
  isTruncated: boolean;
  nextContinuationToken?: string;
}

const RE_CONTENTS = /<Contents>([\s\S]*?)<\/Contents>/g;
const RE_KEY = /<Key>(.*?)<\/Key>/;
const RE_LAST_MODIFIED = /<LastModified>(.*?)<\/LastModified>/;
const RE_SIZE = /<Size>(.*?)<\/Size>/;
const RE_IS_TRUNCATED = /<IsTruncated>(.*?)<\/IsTruncated>/;
const RE_NEXT_TOKEN = /<NextContinuationToken>(.*?)<\/NextContinuationToken>/;

export async function listarObjetos(
  config: StorageConfig,
  prefix?: string,
  continuationToken?: string
): Promise<ListResult> {
  const url = new URL(config.endpoint);
  url.pathname = `/${config.bucket}`;
  url.searchParams.set("list-type", "2");
  if (prefix) {
    url.searchParams.set("prefix", prefix);
  }
  if (continuationToken) {
    url.searchParams.set("continuation-token", continuationToken);
  }

  const s3 = getClient(config);
  const presigned = s3.presign(`?${url.searchParams.toString()}`, {
    method: "GET",
    expiresIn: 60,
  });

  const res = await fetch(presigned);
  if (!res.ok) {
    throw new Error(`Falha ao listar objetos: ${res.status} ${res.statusText}`);
  }

  const xml = await res.text();
  const contents = [...xml.matchAll(RE_CONTENTS)].map((m) => ({
    key: m[1].match(RE_KEY)?.[1] ?? "",
    lastModified: m[1].match(RE_LAST_MODIFIED)?.[1] ?? "",
    size: Number(m[1].match(RE_SIZE)?.[1] ?? 0),
  }));

  const isTruncated = xml.match(RE_IS_TRUNCATED)?.[1] === "true";
  const nextToken = xml.match(RE_NEXT_TOKEN)?.[1] ?? undefined;

  return {
    contents,
    isTruncated,
    nextContinuationToken: nextToken,
  };
}
