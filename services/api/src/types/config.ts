export interface ApiConfig {
  port: number;
  corsOrigin: string;
  mlServiceUrl: string;
  optimizerServiceUrl: string;
  databaseUrl: string;
  redisUrl: string;
  dashboardCacheTtlSeconds: number;
  minioEndpoint: string;
  minioAccessKey: string;
  minioSecretKey: string;
  minioBucket: string;
  minioRegion: string;
}
