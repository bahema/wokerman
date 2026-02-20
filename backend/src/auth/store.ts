import { randomBytes, randomInt, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createAsyncQueue } from "../utils/asyncQueue.js";

type OwnerRecord = {
  email: string;
  fullName: string;
  role: string;
  timezone: string;
  twoFactorEnabled: boolean;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
};

type PendingSignupRecord = {
  email: string;
  passwordHash: string;
  passwordSalt: string;
  expiresAt: number;
};

type PendingOtpRecord = {
  email: string;
  purpose: "signup" | "login";
  code: string;
  expiresAt: number;
};

type SessionRecord = {
  token: string;
  createdAt: string;
  expiresAt: number;
};

type AttemptState = {
  count: number;
  windowStart: number;
  blockedUntil: number;
};

type SessionPayload = {
  token: string;
  expiresAt: number;
  ownerEmail: string;
};

type AuthStoreRecord = {
  owner: OwnerRecord | null;
  pendingSignup: PendingSignupRecord | null;
  pendingOtp: PendingOtpRecord | null;
  sessions: SessionRecord[];
  attemptState: Record<string, AttemptState>;
  updatedAt: string;
};

const SIGNUP_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 10 * 24 * 60 * 60 * 1000;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const ATTEMPT_BLOCK_MS = 15 * 60 * 1000;
const MAX_START_ATTEMPTS = 5;
const MAX_VERIFY_ATTEMPTS = 5;

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

const readJson = async <T>(filePath: string, fallback: T): Promise<T> => {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = async (filePath: string, data: unknown) => {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
};

const now = () => Date.now();

const hashPassword = (password: string, salt = randomBytes(16).toString("hex")) => {
  const passwordHash = scryptSync(password, salt, 64).toString("hex");
  return { passwordHash, passwordSalt: salt };
};

const verifyPassword = (password: string, hash: string, salt: string) => {
  const nextHash = scryptSync(password, salt, 64);
  const savedHash = Buffer.from(hash, "hex");
  if (savedHash.length !== nextHash.length) return false;
  return timingSafeEqual(savedHash, nextHash);
};

export class AuthRateLimitError extends Error {
  retryAfterSec: number;

  constructor(retryAfterSec: number) {
    super("Too many attempts. Try again later.");
    this.name = "AuthRateLimitError";
    this.retryAfterSec = retryAfterSec;
  }
}

export const isAuthRateLimitError = (error: unknown): error is AuthRateLimitError => error instanceof AuthRateLimitError;

const attemptKey = (scope: "signup:start" | "signup:verify" | "login:start" | "login:verify", email: string) => `${scope}:${email}`;

const registerFailedAttempt = (record: AuthStoreRecord, key: string, maxAttempts: number) => {
  const timestamp = now();
  const current = record.attemptState[key];
  let next: AttemptState;
  if (!current || timestamp - current.windowStart > ATTEMPT_WINDOW_MS) {
    next = { count: 1, windowStart: timestamp, blockedUntil: 0 };
  } else {
    const count = current.count + 1;
    next = {
      count,
      windowStart: current.windowStart,
      blockedUntil: count >= maxAttempts ? timestamp + ATTEMPT_BLOCK_MS : 0
    };
  }
  return {
    ...record,
    attemptState: {
      ...record.attemptState,
      [key]: next
    }
  };
};

const clearAttempt = (record: AuthStoreRecord, key: string): AuthStoreRecord => {
  if (!(key in record.attemptState)) return record;
  const nextAttemptState = { ...record.attemptState };
  delete nextAttemptState[key];
  return { ...record, attemptState: nextAttemptState };
};

const normalizeOwner = (owner: OwnerRecord | null): OwnerRecord | null => {
  if (!owner) return null;
  return {
    ...owner,
    fullName: owner.fullName || "Boss Admin",
    role: owner.role || "Owner",
    timezone: owner.timezone || "UTC",
    twoFactorEnabled: Boolean(owner.twoFactorEnabled)
  };
};

export const createAuthStore = async (baseDir: string) => {
  const dataDir = path.join(baseDir, "auth");
  const dataPath = path.join(dataDir, "state.json");
  await ensureDir(dataDir);

  const initial: AuthStoreRecord = {
    owner: null,
    pendingSignup: null,
    pendingOtp: null,
    sessions: [],
    attemptState: {},
    updatedAt: new Date().toISOString()
  };

  const existing = await readJson<AuthStoreRecord>(dataPath, initial);
  await writeJson(dataPath, existing);
  const runExclusive = createAsyncQueue();

  const read = async () => {
    const record = await readJson<AuthStoreRecord>(dataPath, initial);
    const attemptState = record.attemptState ?? {};
    const normalizedOwner = normalizeOwner(record.owner);
    const timestamp = now();
    const activeSessions = record.sessions.filter((session) => session.expiresAt > timestamp);
    const activeAttemptState = Object.entries(attemptState).reduce<Record<string, AttemptState>>((acc, [key, value]) => {
      const blocked = value.blockedUntil > timestamp;
      const inWindow = timestamp - value.windowStart <= ATTEMPT_WINDOW_MS;
      if (blocked || inWindow) acc[key] = value;
      return acc;
    }, {});
    return { ...record, owner: normalizedOwner, sessions: activeSessions, attemptState: activeAttemptState };
  };

  const save = async (record: AuthStoreRecord) => {
    const next = { ...record, updatedAt: new Date().toISOString() };
    await writeJson(dataPath, next);
    return next;
  };

  const assertNotBlocked = (record: AuthStoreRecord, key: string) => {
    const state = record.attemptState[key];
    if (!state) return;
    if (state.blockedUntil > now()) {
      throw new AuthRateLimitError(Math.ceil((state.blockedUntil - now()) / 1000));
    }
  };

  const getStatus = async () => {
    const record = await read();
    return {
      hasOwner: Boolean(record.owner)
    };
  };

  const startSignup = async (email: string, password: string): Promise<SessionPayload> => {
    return runExclusive(async () => {
      const normalizedEmail = email.trim().toLowerCase();
      const record = await read();
      const rateKey = attemptKey("signup:start", normalizedEmail || "unknown");
      assertNotBlocked(record, rateKey);
      if (!normalizedEmail.includes("@")) {
        await save(registerFailedAttempt(record, rateKey, MAX_START_ATTEMPTS));
        throw new Error("Valid email is required.");
      }
      if (password.length < 8) {
        await save(registerFailedAttempt(record, rateKey, MAX_START_ATTEMPTS));
        throw new Error("Password must be at least 8 characters.");
      }
      if (record.owner) throw new Error("Owner account already exists. Signup is disabled.");

      const { passwordHash, passwordSalt } = hashPassword(password);
      const owner: OwnerRecord = {
        email: normalizedEmail,
        fullName: "Boss Admin",
        role: "Owner",
        timezone: "UTC",
        twoFactorEnabled: false,
        passwordHash,
        passwordSalt,
        createdAt: new Date().toISOString()
      };
      const session: SessionRecord = {
        token: randomUUID(),
        createdAt: new Date().toISOString(),
        expiresAt: now() + SESSION_TTL_MS
      };

      const next = await save(
        clearAttempt(
          {
            ...record,
            owner,
            pendingSignup: null,
            pendingOtp: null,
            sessions: [session]
          },
          rateKey
        )
      );

      return {
        token: session.token,
        expiresAt: session.expiresAt,
        ownerEmail: next.owner?.email ?? normalizedEmail
      };
    });
  };

  const verifySignup = async (_email: string, _otpCode: string): Promise<SessionPayload> => {
    return runExclusive(async () => {
      throw new Error("OTP verification is disabled. Use email and password login.");
    });
  };

  const startLogin = async (email: string, password: string): Promise<SessionPayload> => {
    return runExclusive(async () => {
      const normalizedEmail = email.trim().toLowerCase();
      const record = await read();
      const rateKey = attemptKey("login:start", normalizedEmail || "unknown");
      assertNotBlocked(record, rateKey);
      if (!record.owner || record.owner.email !== normalizedEmail || !verifyPassword(password, record.owner.passwordHash, record.owner.passwordSalt)) {
        await save(registerFailedAttempt(record, rateKey, MAX_START_ATTEMPTS));
        throw new Error("Invalid credentials.");
      }

      const session: SessionRecord = {
        token: randomUUID(),
        createdAt: new Date().toISOString(),
        expiresAt: now() + SESSION_TTL_MS
      };
      const activeSessions = record.sessions.filter((item) => item.expiresAt > now());
      await save(
        clearAttempt(
          {
            ...record,
            pendingOtp: null,
            sessions: [...activeSessions, session]
          },
          rateKey
        )
      );
      return {
        token: session.token,
        expiresAt: session.expiresAt,
        ownerEmail: normalizedEmail
      };
    });
  };

  const verifyLogin = async (_email: string, _otpCode: string): Promise<SessionPayload> => {
    return runExclusive(async () => {
      throw new Error("OTP verification is disabled. Use email and password login.");
    });
  };

  const verifySession = async (token: string) => {
    if (!token) return false;
    const record = await read();
    return record.sessions.some((session) => session.token === token && session.expiresAt > now());
  };

  const logout = async (token: string) => {
    await runExclusive(async () => {
      const record = await read();
      const nextSessions = record.sessions.filter((session) => session.token !== token);
      await save({ ...record, sessions: nextSessions });
    });
  };

  const logoutAll = async (keepToken?: string) => {
    await runExclusive(async () => {
      const record = await read();
      if (keepToken) {
        const current = record.sessions.find((session) => session.token === keepToken && session.expiresAt > now());
        await save({ ...record, sessions: current ? [current] : [] });
        return;
      }
      await save({ ...record, sessions: [] });
    });
  };

  const getAccountSettings = async () => {
    const record = await read();
    if (!record.owner) throw new Error("Owner account not created yet.");
    return {
      fullName: record.owner.fullName,
      email: record.owner.email,
      role: record.owner.role,
      timezone: record.owner.timezone,
      twoFactorEnabled: record.owner.twoFactorEnabled
    };
  };

  const updateAccountSettings = async (settings: {
    fullName: string;
    timezone: string;
    twoFactorEnabled: boolean;
  }) => {
    return runExclusive(async () => {
      const record = await read();
      if (!record.owner) throw new Error("Owner account not created yet.");
      const nextOwner: OwnerRecord = {
        ...record.owner,
        fullName: settings.fullName.trim() || "Boss Admin",
        // Single-owner identity is immutable after first signup.
        email: record.owner.email,
        role: record.owner.role || "Owner",
        timezone: settings.timezone.trim() || "UTC",
        // OTP/2FA is disabled for this deployment mode.
        twoFactorEnabled: false
      };
      await save({ ...record, owner: nextOwner });
      return {
        fullName: nextOwner.fullName,
        email: nextOwner.email,
        role: nextOwner.role,
        timezone: nextOwner.timezone,
        twoFactorEnabled: nextOwner.twoFactorEnabled
      };
    });
  };

  const changePassword = async (currentPassword: string, newPassword: string, _currentToken?: string): Promise<SessionPayload> => {
    return runExclusive(async () => {
      const record = await read();
      if (!record.owner) throw new Error("Owner account not created yet.");
      if (!currentPassword || !newPassword) throw new Error("Current and new password are required.");
      if (!verifyPassword(currentPassword, record.owner.passwordHash, record.owner.passwordSalt)) {
        throw new Error("Current password is incorrect.");
      }
      if (newPassword.length < 8) throw new Error("New password must be at least 8 characters.");
      const { passwordHash, passwordSalt } = hashPassword(newPassword);
      const nextOwner: OwnerRecord = { ...record.owner, passwordHash, passwordSalt };
      const rotatedSession: SessionRecord = {
        token: randomUUID(),
        createdAt: new Date().toISOString(),
        expiresAt: now() + SESSION_TTL_MS
      };
      await save({
        ...record,
        owner: nextOwner,
        pendingOtp: null,
        // Rotate all sessions after password change; issue exactly one fresh session.
        sessions: [rotatedSession]
      });
      return {
        token: rotatedSession.token,
        expiresAt: rotatedSession.expiresAt,
        ownerEmail: nextOwner.email
      };
    });
  };

  return {
    getStatus,
    startSignup,
    verifySignup,
    startLogin,
    verifyLogin,
    verifySession,
    logout,
    logoutAll,
    getAccountSettings,
    updateAccountSettings,
    changePassword
  };
};
