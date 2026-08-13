export type NakamaPublicConfig = {
  host: string;
  port: string;
  ssl: boolean;
};

export type NakamaServerConfig = NakamaPublicConfig & {
  serverKey: string;
  timeoutMs: number;
};

function readRequired(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return trimmed;
}

function parsePort(value: string): string {
  if (!/^\d+$/.test(value)) {
    throw new Error("NEXT_PUBLIC_NAKAMA_PORT must be a number.");
  }

  const port = Number(value);
  if (port < 1 || port > 65535) {
    throw new Error("NEXT_PUBLIC_NAKAMA_PORT must be between 1 and 65535.");
  }

  return value;
}

function parseSsl(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") {
    return true;
  }
  if (normalized === "false" || normalized === "0") {
    return false;
  }
  throw new Error("NEXT_PUBLIC_NAKAMA_SSL must be true or false.");
}

export function getNakamaPublicConfig(): NakamaPublicConfig {
  return {
    host: readRequired(
      "NEXT_PUBLIC_NAKAMA_HOST",
      process.env.NEXT_PUBLIC_NAKAMA_HOST,
    ),
    port: parsePort(
      readRequired("NEXT_PUBLIC_NAKAMA_PORT", process.env.NEXT_PUBLIC_NAKAMA_PORT),
    ),
    ssl: parseSsl(
      readRequired("NEXT_PUBLIC_NAKAMA_SSL", process.env.NEXT_PUBLIC_NAKAMA_SSL),
    ),
  };
}

export function getNakamaServerConfig(): NakamaServerConfig {
  const publicConfig = getNakamaPublicConfig();
  const serverKey = readRequired(
    "NAKAMA_SERVER_KEY",
    process.env.NAKAMA_SERVER_KEY,
  );

  if (serverKey === "replace_with_server_key") {
    throw new Error(
      "NAKAMA_SERVER_KEY is still the example placeholder. Set the Nakama client server key.",
    );
  }

  return {
    ...publicConfig,
    serverKey,
    timeoutMs: 15000,
  };
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getSiteUrl(): string {
  const configured = process.env.SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return "https://account.xoranetwork.com";
}
