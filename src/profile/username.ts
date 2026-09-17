export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;

export function normalizeUsername(value: unknown): string {
  return String(value ?? "").trim();
}

export function usernameLookupKey(value: unknown): string {
  return normalizeUsername(value).toLocaleLowerCase("en-US");
}

export function validateUsername(value: unknown): string | null {
  const username = normalizeUsername(value);
  if (username.length < USERNAME_MIN_LENGTH) return "USERNAME_TOO_SHORT";
  if (username.length > USERNAME_MAX_LENGTH) return "USERNAME_TOO_LONG";
  if (!/^[A-Za-z0-9._-]+$/.test(username)) return "USERNAME_INVALID_CHARACTERS";
  if (!/[A-Za-z0-9]/.test(username)) return "USERNAME_INVALID";
  return null;
}
