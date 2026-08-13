export type ConnectedAuthMethod = {
  id: string;
  label: string;
  connected: boolean;
  detail?: string;
};

export type PublicProfile = {
  /** Always the username. Nakama's internal UUID is not the XOrA Network user ID. */
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  location: string;
  createdAt: string | null;
  online: boolean;
};

export type PublicAccount = PublicProfile & {
  email: string;
  disabled: boolean;
  emailVerified: boolean;
  connectedMethods: ConnectedAuthMethod[];
};

export type SessionTokens = {
  token: string;
  refreshToken: string;
};

export type ProfileUpdateInput = {
  displayName: string;
  username: string;
  avatarUrl: string;
  location: string;
};
