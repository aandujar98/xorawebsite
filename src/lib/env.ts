export type NakamaPublicConfig = {
  host: string;
  port: string;
  ssl: boolean;
};

export type NakamaServerConfig = NakamaPublicConfig & {
  serverKey: string;
  timeoutMs: number;
  httpKey: string | null;
};

const INSECURE_HTTP_KEYS = new Set(["defaulthttpkey", "defaultkey"]);
const NAKAMA_CLIENT_TIMEOUT_MS = 15_000;

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
    timeoutMs: NAKAMA_CLIENT_TIMEOUT_MS,
    httpKey: getNakamaHttpKey(),
  };
}

export function getNakamaHttpKey(): string | null {
  const httpKey = process.env.NAKAMA_HTTP_KEY?.trim() || null;
  if (!httpKey) {
    return null;
  }

  if (INSECURE_HTTP_KEYS.has(httpKey.toLowerCase())) {
    throw new Error(
      "NAKAMA_HTTP_KEY is a published default. Set runtime.http_key to a unique value and copy it into NAKAMA_HTTP_KEY.",
    );
  }

  return httpKey;
}

export function getRecoverySecret(): string {
  const secret = readRequired(
    "XORA_RECOVERY_SECRET",
    process.env.XORA_RECOVERY_SECRET,
  );
  const serverKey = process.env.NAKAMA_SERVER_KEY?.trim() ?? "";

  if (secret === serverKey) {
    throw new Error(
      "XORA_RECOVERY_SECRET must not equal NAKAMA_SERVER_KEY. SERVER_KEY is not administrator authentication.",
    );
  }

  return secret;
}

export function assertNakamaClientEndpoint(
  config: NakamaPublicConfig = getNakamaPublicConfig(),
): void {
  if (config.host !== "api.xoranetwork.com") {
    return;
  }

  if (config.port !== "443" || !config.ssl) {
    throw new Error(
      "api.xoranetwork.com requires NEXT_PUBLIC_NAKAMA_PORT=443 and NEXT_PUBLIC_NAKAMA_SSL=true.",
    );
  }
}

export function assertRecoveryRuntimeConfig(): void {
  const config = getNakamaServerConfig();
  assertNakamaClientEndpoint(config);
  getRecoverySecret();
  getNakamaHttpKey();

  if (getMailConfig() === null) {
    throw new Error(
      "Password recovery requires EMAIL_FROM and RESEND_API_KEY or SMTP_HOST.",
    );
  }
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

export type MailConfig = {
  from: string;
  resendApiKey?: string;
  smtpHost?: string;
  smtpPort: number;
  smtpUser?: string;
  smtpPassword?: string;
  testRecipient?: string;
};

export function getMailFromAddress(): string {
  return (process.env.EMAIL_FROM ?? process.env.MAIL_FROM ?? "").trim();
}

export function getMailConfig(): MailConfig | null {
  const from = getMailFromAddress();
  if (!from) {
    return null;
  }

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const smtpHost = process.env.SMTP_HOST?.trim();
  if (!resendApiKey && !smtpHost) {
    return null;
  }

  const smtpPortRaw = process.env.SMTP_PORT?.trim() || "587";
  const smtpPort = /^\d+$/.test(smtpPortRaw) ? Number(smtpPortRaw) : 587;

  return {
    from,
    resendApiKey: resendApiKey || undefined,
    smtpHost: smtpHost || undefined,
    smtpPort,
    smtpUser: process.env.SMTP_USER?.trim() || undefined,
    smtpPassword: process.env.SMTP_PASSWORD?.trim() || undefined,
    testRecipient: process.env.EMAIL_TEST_TO?.trim().toLowerCase() || undefined,
  };
}

export function getMailTestRecipient(): string | null {
  return getMailConfig()?.testRecipient ?? null;
}
