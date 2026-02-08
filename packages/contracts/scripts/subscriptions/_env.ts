import { getAddress, isAddress, type Address } from "viem";

function isNonEmpty(value: string | undefined): value is string {
  return Boolean(value && value.trim().length > 0);
}

export function envString(name: string, fallback?: string): string {
  const value = process.env[name];
  if (isNonEmpty(value)) return value.trim();
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required environment variable: ${name}`);
}

export function envAddress(name: string, fallback?: string): Address {
  const value = process.env[name] ?? fallback;
  if (!isNonEmpty(value)) {
    throw new Error(`Missing required address variable: ${name}`);
  }
  if (!isAddress(value)) {
    throw new Error(`Invalid address for ${name}: ${value}`);
  }
  return getAddress(value);
}

export function envAddressOptional(name: string, fallback?: string): Address | undefined {
  const value = process.env[name] ?? fallback;
  if (!isNonEmpty(value)) return undefined;
  if (!isAddress(value)) {
    throw new Error(`Invalid address for ${name}: ${value}`);
  }
  return getAddress(value);
}

export function envNumber(name: string, fallback: number): number {
  const value = process.env[name];
  if (!isNonEmpty(value)) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric value for ${name}: ${value}`);
  }
  return parsed;
}

export function envBoolean(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (!isNonEmpty(value)) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  throw new Error(`Invalid boolean value for ${name}: ${value}`);
}
