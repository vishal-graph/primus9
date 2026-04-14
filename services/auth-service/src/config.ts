import { z } from 'zod';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

const configSchema = z.object({
  port: z.coerce.number().default(4500),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  serviceName: z.string().default('tatvaops-auth-service'),
  corsOrigins: z
    .string()
    .transform((s) => s.split(',').map((o) => o.trim()))
    .default('http://localhost:3000'),
  frontendUrl: z.string().default('http://localhost:3000'),

  // Database
  databaseUrl: z.string().min(1),

  // Google OAuth
  googleClientId: z.string().min(1),
  googleClientSecret: z.string().min(1),
  googleCallbackUrl: z.string().default('https://small-eva-underlying-ping.trycloudflare.com/auth/google/callback'),

  // JWT (access token — also used for cookie maxAge so session doesn’t “expire” too soon)
  jwtSecret: z.string().min(32),
  jwtAccessExpiry: z.string().default('1h'),
  jwtRefreshExpiry: z.string().default('30d'),

  // Cookie
  cookieDomain: z.string().default('localhost'),
  cookieSecure: z.coerce.boolean().default(false),

  // Internal users
  internalEmailDomains: z
    .string()
    .transform((s) => s.split(',').map((d) => d.trim().toLowerCase()))
    .default('tatvaops.com'),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  try {
    return configSchema.parse({
      port: process.env.PORT,
      nodeEnv: process.env.NODE_ENV,
      serviceName: process.env.SERVICE_NAME,
      corsOrigins: process.env.CORS_ORIGINS,
      frontendUrl: process.env.FRONTEND_URL,
      databaseUrl: process.env.DATABASE_URL,
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
      googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL,
      jwtSecret: process.env.JWT_SECRET,
      jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY,
      jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY,
      cookieDomain: process.env.COOKIE_DOMAIN,
      cookieSecure: process.env.COOKIE_SECURE,
      internalEmailDomains: process.env.INTERNAL_EMAIL_DOMAINS,
    });
  } catch (error) {
    console.error('❌ Auth Service — Config validation failed:');
    if (error instanceof z.ZodError) {
      error.errors.forEach((e) => console.error(`  ${e.path.join('.')}: ${e.message}`));
    }
    process.exit(1);
  }
}

export const config = loadConfig();
export const isProduction = config.nodeEnv === 'production';
