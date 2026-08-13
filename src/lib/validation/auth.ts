export type FieldErrors = Record<string, string>;

const EMAIL_PATTERN = /^(?:[^\s@]+)@(?:[^\s@]+)\.(?:[^\s@]+)$/;
const CONTROL_OR_SPACE = /[\u0000-\u001F\u007F\s]/;
const CONTROL_ONLY = /[\u0000-\u001F\u007F]/;

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateEmail(value: string): string | null {
  const email = normalizeEmail(value);
  const bytes = byteLength(email);

  if (!email || bytes < 10 || bytes > 255 || !EMAIL_PATTERN.test(email)) {
    return "INVALID_EMAIL";
  }

  return null;
}

export function validateUsername(value: string): string | null {
  const username = value.trim();
  const bytes = byteLength(username);

  if (
    username.length < 3 ||
    bytes < 3 ||
    bytes > 128 ||
    CONTROL_OR_SPACE.test(username)
  ) {
    return "INVALID_USERNAME";
  }

  return null;
}

export function validateDisplayName(value: string): string | null {
  const displayName = value.trim();
  const bytes = byteLength(displayName);

  if (
    displayName.length < 1 ||
    displayName.length > 64 ||
    bytes > 64 ||
    CONTROL_ONLY.test(displayName)
  ) {
    return "INVALID_DISPLAY_NAME";
  }

  return null;
}

export function validatePassword(value: string): string | null {
  if (value.length < 8 || value.length > 128) {
    return "WEAK_PASSWORD";
  }

  const hasLetter = /[A-Za-z]/.test(value);
  const hasNumber = /\d/.test(value);

  if (!hasLetter || !hasNumber) {
    return "WEAK_PASSWORD";
  }

  return null;
}

export function validatePasswordMatch(
  password: string,
  confirmPassword: string,
): string | null {
  if (password !== confirmPassword) {
    return "PASSWORD_MISMATCH";
  }

  return null;
}

export function validateLocation(value: string): string | null {
  const location = value.trim();
  if (!location) {
    return null;
  }

  const bytes = byteLength(location);
  if (location.length > 64 || bytes > 64 || CONTROL_ONLY.test(location)) {
    return "INVALID_LOCATION";
  }

  return null;
}

export function validateAvatarUrl(value: string): string | null {
  const avatarUrl = value.trim();
  if (!avatarUrl) {
    return null;
  }

  if (avatarUrl.length > 2048) {
    return "INVALID_AVATAR_URL";
  }

  if (avatarUrl.startsWith("/api/avatars/")) {
    return null;
  }

  try {
    const parsed = new URL(avatarUrl);
    if (parsed.protocol !== "https:") {
      return "INVALID_AVATAR_URL";
    }
  } catch {
    return "INVALID_AVATAR_URL";
  }

  return null;
}

export type RegisterInput = {
  email: string;
  username: string;
  displayName: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

export type LoginInput = {
  email: string;
  password: string;
  rememberMe: boolean;
};

export type ValidatedRegisterInput = {
  email: string;
  username: string;
  displayName: string;
  password: string;
};

export type ValidatedLoginInput = {
  email: string;
  password: string;
  rememberMe: boolean;
};

export function validateRegisterInput(input: RegisterInput): {
  values?: ValidatedRegisterInput;
  errors: FieldErrors;
  code?: string;
} {
  const errors: FieldErrors = {};
  const emailError = validateEmail(input.email);
  const usernameError = validateUsername(input.username);
  const displayNameError = validateDisplayName(input.displayName);
  const passwordError = validatePassword(input.password);
  const matchError = validatePasswordMatch(
    input.password,
    input.confirmPassword,
  );

  if (emailError) errors.email = emailError;
  if (usernameError) errors.username = usernameError;
  if (displayNameError) errors.displayName = displayNameError;
  if (passwordError) errors.password = passwordError;
  if (matchError) errors.confirmPassword = matchError;
  if (!input.acceptTerms) errors.acceptTerms = "TERMS_REQUIRED";

  if (Object.keys(errors).length > 0) {
    return { errors, code: Object.values(errors)[0] };
  }

  return {
    errors,
    values: {
      email: normalizeEmail(input.email),
      username: input.username.trim(),
      displayName: input.displayName.trim(),
      password: input.password,
    },
  };
}

export function validateLoginInput(input: LoginInput): {
  values?: ValidatedLoginInput;
  errors: FieldErrors;
  code?: string;
} {
  const errors: FieldErrors = {};
  const emailError = validateEmail(input.email);

  if (emailError) {
    errors.email = emailError;
  }

  if (!input.password) {
    errors.password = "INVALID_CREDENTIALS";
  }

  if (Object.keys(errors).length > 0) {
    return { errors, code: Object.values(errors)[0] };
  }

  return {
    errors,
    values: {
      email: normalizeEmail(input.email),
      password: input.password,
      rememberMe: Boolean(input.rememberMe),
    },
  };
}

export function validateProfileInput(input: ProfileUpdateInputLike): {
  values?: {
    displayName: string;
    username: string;
    avatarUrl: string;
    location: string;
  };
  errors: FieldErrors;
  code?: string;
} {
  const errors: FieldErrors = {};
  const displayNameError = validateDisplayName(input.displayName);
  const usernameError = validateUsername(input.username);
  const avatarError = validateAvatarUrl(input.avatarUrl);
  const locationError = validateLocation(input.location ?? "");

  if (displayNameError) errors.displayName = displayNameError;
  if (usernameError) errors.username = usernameError;
  if (avatarError) errors.avatarUrl = avatarError;
  if (locationError) errors.location = locationError;

  if (Object.keys(errors).length > 0) {
    return { errors, code: Object.values(errors)[0] };
  }

  return {
    errors,
    values: {
      displayName: input.displayName.trim(),
      username: input.username.trim(),
      avatarUrl: input.avatarUrl.trim(),
      location: (input.location ?? "").trim(),
    },
  };
}

export type ProfileUpdateInputLike = {
  displayName: string;
  username: string;
  avatarUrl: string;
  location?: string;
};
