const CryptoHasher = Bun.CryptoHasher;

export interface CorsConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  origins: string[];
}

function hmacSha256(key: Uint8Array | string, data: string): Uint8Array {
  const hmac = new CryptoHasher("sha256", key);
  hmac.update(data);
  return hmac.digest();
}

function sha256Hex(data: string): string {
  const hasher = new CryptoHasher("sha256");
  hasher.update(data);
  return hasher.digest("hex");
}

function toHex(buffer: Uint8Array): string {
  return Buffer.from(buffer).toString("hex");
}

function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Uint8Array {
  const kDate = hmacSha256(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  return hmacSha256(kService, "aws4_request");
}

const RE_DECIMAL = /\.\d+/;

export async function configurarCors(config: CorsConfig): Promise<void> {
  if (config.origins.length === 0) {
    console.warn("Nenhuma origem fornecida para configurar CORS.");
    return;
  }

  const corsXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<CORSConfiguration>",
    "  <CORSRule>",
    ...config.origins.map((o) => `    <AllowedOrigin>${o}</AllowedOrigin>`),
    "    <AllowedMethod>GET</AllowedMethod>",
    "    <AllowedMethod>PUT</AllowedMethod>",
    "    <AllowedMethod>HEAD</AllowedMethod>",
    "    <AllowedMethod>DELETE</AllowedMethod>",
    "    <AllowedHeader>Content-Type</AllowedHeader>",
    "    <ExposeHeader>ETag</ExposeHeader>",
    "    <MaxAgeSeconds>600</MaxAgeSeconds>",
    "  </CORSRule>",
    "</CORSConfiguration>",
  ].join("\n");

  const url = new URL(config.endpoint);
  const host = `${config.bucket}.${url.host}`;
  const now = new Date();
  const amzDate = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(RE_DECIMAL, "");
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = sha256Hex(corsXml);
  const contentMd5 = Buffer.from(
    new CryptoHasher("md5").update(corsXml).digest()
  ).toString("base64");

  const canonicalHeaders = [
    `content-md5:${contentMd5}`,
    "content-type:application/xml",
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ].join("\n");

  const signedHeaders =
    "content-md5;content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    "PUT",
    "/",
    "cors=",
    `${canonicalHeaders}\n`,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = getSignatureKey(
    config.secretAccessKey,
    dateStamp,
    config.region,
    "s3"
  );
  const signature = toHex(hmacSha256(signingKey, stringToSign));
  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`${url.protocol}//${host}/?cors`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/xml",
      "Content-MD5": contentMd5,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      Authorization: authorization,
      Host: host,
    },
    body: corsXml,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Falha ao configurar CORS: ${res.status} ${body}`);
  }
}
