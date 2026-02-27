import { PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

export interface CorsConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  origins: string[];
}

export async function configurarCors(config: CorsConfig): Promise<void> {
  if (config.origins.length === 0) {
    console.warn("Nenhuma origem fornecida para configurar CORS.");
    return;
  }

  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  await client.send(
    new PutBucketCorsCommand({
      Bucket: config.bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: config.origins,
            AllowedMethods: ["GET", "PUT", "HEAD", "DELETE"],
            AllowedHeaders: ["Content-Type"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 600,
          },
        ],
      },
    })
  );
}

// Exemplo de uso:
// await configurarCors({
//   endpoint: "https://s3.exemplo.com",
//   region: "auto",
//   accessKeyId: "...",
//   secretAccessKey: "...",
//   bucket: "meu-bucket",
//   origins: ["https://app.exemplo.com"],
// });
