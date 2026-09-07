export function authSecretConfigured() {
  const value = process.env.TAALLAMT_AUTH_PEPPER;
  return Boolean(value && value.length >= 32);
}

export function requireAuthSecret() {
  const value = process.env.TAALLAMT_AUTH_PEPPER;
  if (!value || value.length < 32) {
    throw new Error("TAALLAMT_AUTH_PEPPER is not configured");
  }
  return value;
}
