import dotenv from 'dotenv';

export type NodeEnv = 'development' | 'production' | 'test';
export type AuthMode = 'local' | 'entra';

export interface AppConfig {
  nodeEnv: NodeEnv;
  isProduction: boolean;
  isTest: boolean;
  port: number;
  mongodbUri: string | undefined;
  authMode: AuthMode;
  jwtSecret: string | undefined;
  ownerOid: string | undefined;
  websiteAuthEnabled: boolean;
  corsOrigins: string[];
}

const VALID_NODE_ENVS = new Set<NodeEnv>(['development', 'production', 'test']);
const VALID_AUTH_MODES = new Set<AuthMode>(['local', 'entra']);
const DEFAULT_DEV_MONGODB_URI = 'mongodb://localhost:27017/type-the-bible';
const DEFAULT_DEV_CORS_ORIGINS = ['http://localhost:3000', 'http://localhost:3001'];

function parsePort(rawPort: string | undefined): number {
  const trimmed = rawPort?.trim();
  if (!trimmed) {
    return 3001;
  }
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`Invalid PORT "${trimmed}". Expected an integer between 1 and 65535.`);
  }
  const port = Number(trimmed);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT "${trimmed}". Expected an integer between 1 and 65535.`);
  }
  return port;
}

export function parseConfig(env: Record<string, string | undefined>): AppConfig {
  const rawNodeEnv = env.NODE_ENV?.trim() || 'development';
  if (!VALID_NODE_ENVS.has(rawNodeEnv as NodeEnv)) {
    throw new Error(
      `Invalid NODE_ENV "${rawNodeEnv}". Expected development, production, or test.`
    );
  }
  const nodeEnv = rawNodeEnv as NodeEnv;
  const isProduction = nodeEnv === 'production';
  const isTest = nodeEnv === 'test';

  const port = parsePort(env.PORT);

  const rawAuthMode = env.AUTH_MODE?.trim() || 'local';
  if (!VALID_AUTH_MODES.has(rawAuthMode as AuthMode)) {
    throw new Error(`Invalid AUTH_MODE "${rawAuthMode}". Expected local or entra.`);
  }
  const authMode = rawAuthMode as AuthMode;

  const jwtSecret = env.JWT_SECRET?.trim() || undefined;
  if (isProduction && authMode === 'local' && !jwtSecret) {
    throw new Error('JWT_SECRET is required when NODE_ENV=production and AUTH_MODE=local.');
  }

  const websiteAuthEnabled = env.WEBSITE_AUTH_ENABLED === 'True';
  const ownerOid = env.OWNER_OID?.trim() || undefined;

  if (authMode === 'entra') {
    if (!websiteAuthEnabled) {
      throw new Error('WEBSITE_AUTH_ENABLED=True is required when AUTH_MODE=entra.');
    }
    if (!ownerOid) {
      throw new Error('OWNER_OID is required when AUTH_MODE=entra.');
    }
  }

  const rawMongoUri = env.MONGODB_URI?.trim() || undefined;
  const mongodbUri = isTest || isProduction ? rawMongoUri : rawMongoUri || DEFAULT_DEV_MONGODB_URI;

  let corsOrigins: string[];
  if (isProduction) {
    corsOrigins = [];
  } else if (env.CORS_ORIGINS !== undefined) {
    corsOrigins = env.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  } else {
    corsOrigins = [...DEFAULT_DEV_CORS_ORIGINS];
  }

  return {
    nodeEnv,
    isProduction,
    isTest,
    port,
    mongodbUri,
    authMode,
    jwtSecret,
    ownerOid,
    websiteAuthEnabled,
    corsOrigins,
  };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (env === process.env && env.NODE_ENV !== 'test') {
    dotenv.config();
  }
  try {
    return parseConfig(env);
  } catch (err: any) {
    console.error(`Configuration error: ${err.message}`);
    process.exit(1);
  }
}

export const config: AppConfig = loadConfig();
export default config;
