import { Client, type Session } from "@heroiclabs/nakama-js";
import { getNakamaServerConfig } from "@/lib/env";

export type NakamaUserSnapshot = {
  id?: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  create_time?: string;
  online?: boolean;
  location?: string;
  lang_tag?: string;
  timezone?: string;
};

export type NakamaAccountSnapshot = {
  email?: string;
  disable_time?: string;
  devices?: Array<{ id?: string }>;
  user?: NakamaUserSnapshot;
};

export type NakamaAccountUpdate = {
  avatar_url?: string;
  display_name?: string;
  username?: string;
  location?: string;
};

export type NakamaGateway = {
  authenticateEmail: (
    email: string,
    password: string,
    create?: boolean,
    username?: string,
  ) => Promise<Session>;
  sessionRefresh: (session: Session) => Promise<Session>;
  sessionLogout: (
    session: Session,
    token: string,
    refreshToken: string,
  ) => Promise<boolean>;
  getAccount: (session: Session) => Promise<NakamaAccountSnapshot>;
  getUsers: (
    session: Session,
    ids?: string[],
    usernames?: string[],
  ) => Promise<{ users?: NakamaUserSnapshot[] }>;
  updateAccount: (
    session: Session,
    request: NakamaAccountUpdate,
  ) => Promise<boolean>;
  deleteAccount: (session: Session) => Promise<boolean>;
};

let cachedClient: Client | null = null;

export function getNakamaClient(): NakamaGateway {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getNakamaServerConfig();

  cachedClient = new Client(
    config.serverKey,
    config.host,
    config.port,
    config.ssl,
    config.timeoutMs,
    false,
  );

  return cachedClient;
}

export function resetNakamaClientForTests() {
  cachedClient = null;
}
