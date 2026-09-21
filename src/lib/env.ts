/**
 * Fail fast on bad configuration.
 *
 * A missing AUTH_SECRET in production means every session cookie is signed
 * with nothing; a missing DATABASE_URL means the first request 500s. Both are
 * far cheaper to catch at boot than in the wild.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. ` +
        `Copy .env.example to .env and fill it in, or set it in your host's dashboard.`,
    );
  }
  return value;
}

const isProduction = process.env.NODE_ENV === "production";

export const env = {
  databaseUrl: required("DATABASE_URL"),
  authSecret: (() => {
    const secret = required("AUTH_SECRET");
    if (isProduction && secret.length < 32) {
      throw new Error("AUTH_SECRET must be at least 32 characters in production.");
    }
    if (isProduction && secret.includes("change-in-production")) {
      throw new Error("AUTH_SECRET is still the development placeholder. Generate a new one.");
    }
    return secret;
  })(),
  isProduction,
};
