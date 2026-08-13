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

export type NakamaFriendSnapshot = {
  state?: number;
  user?: NakamaUserSnapshot;
};

export type NakamaStorageObject = {
  collection?: string;
  key?: string;
  user_id?: string;
  value?: unknown;
};

export type NakamaStorageWrite = {
  collection?: string;
  key?: string;
  value?: object;
  permission_read?: number;
  permission_write?: number;
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
  listFriends: (
    session: Session,
    state?: number,
    limit?: number,
    cursor?: string,
  ) => Promise<{ friends?: NakamaFriendSnapshot[] }>;
  addFriends: (
    session: Session,
    ids?: string[],
    usernames?: string[],
  ) => Promise<boolean>;
  deleteFriends: (
    session: Session,
    ids?: string[],
    usernames?: string[],
  ) => Promise<boolean>;
  writeStorageObjects: (
    session: Session,
    objects: NakamaStorageWrite[],
  ) => Promise<unknown>;
  readStorageObjects: (
    session: Session,
    request: {
      object_ids?: Array<{ collection?: string; key?: string; user_id?: string }>;
    },
  ) => Promise<{ objects?: NakamaStorageObject[] }>;
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
