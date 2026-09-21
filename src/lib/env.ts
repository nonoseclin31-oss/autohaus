/**
 * Configuration, validated on first use rather than on import.
 *
 * Laziness matters: the build runs on the host's CI, where no secrets are
 * present. Validating at module load would crash `next build` before a single
 * page is rendered. Reading through a getter keeps the guarantees at runtime —
 * where they matter — without coupling the build to the secrets.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. ` +
        `Set it in your host's dashboard, or copy .env.example to .env locally.`,
    );
  }
  return value;
}

export const env = {
  get databaseUrl(): string {
    return required("DATABASE_URL");
  },

  get authSecret(): string {
    const secret = required("AUTH_SECRET");
    if (this.isProduction) {
      if (secret.length < 32) {
        throw new Error("AUTH_SECRET must be at least 32 characters in production.");
      }
      if (secret.includes("change-in-production")) {
        throw new Error("AUTH_SECRET is still the development placeholder. Generate a new one.");
      }
    }
    return secret;
  },

  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
};
