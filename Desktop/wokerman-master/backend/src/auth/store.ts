import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createAsyncQueue } from "../utils/asyncQueue.js";

type OwnerRecord = {
  email: string;
  fullName: string;
  role: string;
  timezone: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
};

type SessionRecord = {
  token: string;
  createdAt: string;
  expiresAt: number;
  trustedDeviceTokenHash?: string;
};

type TrustedDeviceRecord = {
  tokenHash: string;
  createdAt: string;
  expiresAt: number;
  lastUsedAt: string;
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
  sessions: SessionRecord[];
  trustedDevices: TrustedDeviceRecord[];
  attemptState: Record<string, AttemptState>;
  updatedAt: string;
};

const SESSION_TTL_MS = 10 * 24 * 60 * 60 * 1000;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const ATTEMPT_BLOCK_MS = 15 * 60 * 1000;
const MAX_START_ATTEMPTS = 5;
const PASSWORD_PEPPER = (process.env.AUTH_PASSWORD_PEPPER ?? "").trim();
const SCRYPT_N = Number(process.env.AUTH_SCRYPT_N ?? 32768);
const SCRYPT_R = Number(process.env.AUTH_SCRYPT_R ?? 8);
const SCRYPT_P = Number(process.env.AUTH_SCRYPT_P ?? 1);
const SCRYPT_MAXMEM = Number(process.env.AUTH_SCRYPT_MAXMEM ?? 96 * 1024 * 1024);
const LEGACY_SCRYPT_N = 16384;
const LEGACY_SCRYPT_R = 8;
const LEGACY_SCRYPT_P = 1;
const LEGACY_SCRYPT_MAXMEM = 32 * 1024 * 1024;
const toHashInput = (password: string) => (PASSWORD_PEPPER ? `${password}:${PASSWORD_PEPPER}` : password);
const deriveHash = (
  password: string,
  salt: string,
  params: { N: number; r: number; p: number; maxmem: number }
) =>
  scryptSync(toHashInput(password), salt, 64, {
    N: params.N,
    r: params.r,
    p: params.p,
    maxmem: params.maxmem
  });
const normalizeScryptParams = () => ({
  N: Number.isFinite(SCRYPT_N) && SCRYPT_N > 1 ? Math.floor(SCRYPT_N) : 32768,
  r: Number.isFinite(SCRYPT_R) && SCRYPT_R > 0 ? Math.floor(SCRYPT_R) : 8,
  p: Number.isFinite(SCRYPT_P) && SCRYPT_P > 0 ? Math.floor(SCRYPT_P) : 1,
  maxmem: Number.isFinite(SCRYPT_MAXMEM) && SCRYPT_MAXMEM > 0 ? Math.floor(SCRYPT_MAXMEM) : 96 * 1024 * 1024
});
const normalizeLegacyScryptParams = () => ({
  N: LEGACY_SCRYPT_N,
  r: LEGACY_SCRYPT_R,
  p: LEGACY_SCRYPT_P,
  maxmem: LEGACY_SCRYPT_MAXMEM
});

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
  const passwordHash = deriveHash(password, salt, normalizeScryptParams()).toString("hex");
  return { passwordHash, passwordSalt: salt };
};

const verifyPassword = (password: string, hash: string, salt: string) => {
  const nextHash = deriveHash(password, salt, normalizeScryptParams());
  const savedHash = Buffer.from(hash, "hex");
  if (savedHash.length !== nextHash.length) return false;
  return timingSafeEqual(savedHash, nextHash);
};

const verifyPasswordLegacy = (password: string, hash: string, salt: string) => {
  const nextHash = deriveHash(password, salt, normalizeLegacyScryptParams());
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

const attemptKey = (scope: "login:start", email: string) => `${scope}:${email}`;

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
    timezone: owner.timezone || "UTC"
  };
};

export const createAuthStore = async (baseDir: string) => {
  const dataDir = path.join(baseDir, "auth");
  const dataPath = path.join(dataDir, "state.json");
  await ensureDir(dataDir);

  const initial: AuthStoreRecord = {
    owner: null,
    sessions: [],
    trustedDevices: [],
    attemptState: {},
    updatedAt: new Date().toISOString()
  };

  const existing = await readJson<AuthStoreRecord>(dataPath, initial);
  await writeJson(dataPath, existing);
  const runExclusive = createAsyncQueue();

  const read = async () => {
    const record = await readJson<AuthStoreRecord>(dataPath, initial);
    const attemptState = record.attemptState ?? {};
    const trustedDevices = Array.isArray(record.trustedDevices) ? record.trustedDevices : [];
    const normalizedOwner = normalizeOwner(record.owner);
    const timestamp = now();
    const activeSessions = record.sessions.filter((session) => session.expiresAt > timestamp);
    const activeTrustedDevices = trustedDevices.filter((device) => device.expiresAt > timestamp);
    const activeAttemptState = Object.entries(attemptState).reduce<Record<string, AttemptState>>((acc, [key, value]) => {
      const blocked = value.blockedUntil > timestamp;
      const inWindow = timestamp - value.windowStart <= ATTEMPT_WINDOW_MS;
      if (blocked || inWindow) acc[key] = value;
      return acc;
    }, {});
    return {
      ...record,
      owner: normalizedOwner,
      sessions: activeSessions,
      trustedDevices: activeTrustedDevices,
      attemptState: activeAttemptState
    };
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

  const startLogin = async (
    email: string,
    password: string,
    options?: { trustedDeviceTokenHash?: string }
  ): Promise<SessionPayload> => {
    return runExclusive(async () => {
      const normalizedEmail = email.trim().toLowerCase();
      const record = await read();
      const rateKey = attemptKey("login:start", normalizedEmail || "unknown");
      assertNotBlocked(record, rateKey);
      const owner = record.owner;
      const primaryPasswordValid =
        owner !== null &&
        owner.email === normalizedEmail &&
        verifyPassword(password, owner.passwordHash, owner.passwordSalt);
      const legacyPasswordValid =
        !primaryPasswordValid &&
        owner !== null &&
        owner.email === normalizedEmail &&
        verifyPasswordLegacy(password, owner.passwordHash, owner.passwordSalt);
      if (!owner || owner.email !== normalizedEmail || (!primaryPasswordValid && !legacyPasswordValid)) {
        await save(registerFailedAttempt(record, rateKey, MAX_START_ATTEMPTS));
        throw new Error("Invalid credentials.");
      }
      const rehashedOwner =
        legacyPasswordValid && owner
          ? (() => {
              const { passwordHash, passwordSalt } = hashPassword(password);
              return { ...owner, passwordHash, passwordSalt };
            })()
          : owner;

      const session: SessionRecord = {
        token: randomUUID(),
        createdAt: new Date().toISOString(),
        expiresAt: now() + SESSION_TTL_MS,
        trustedDeviceTokenHash: options?.trustedDeviceTokenHash?.trim() || undefined
      };
      const activeSessions = record.sessions.filter((item) => item.expiresAt > now());
      await save(
        clearAttempt(
          {
            ...record,
            owner: rehashedOwner,
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

  const verifySession = async (token: string) => {
    if (!token) return false;
    const record = await read();
    return record.sessions.some((session) => session.token === token && session.expiresAt > now());
  };

  const verifySessionForDevice = async (token: string, trustedDeviceTokenHash?: string) => {
    if (!token) return false;
    const normalizedHash = trustedDeviceTokenHash?.trim() || "";
    const record = await read();
    const session = record.sessions.find((item) => item.token === token && item.expiresAt > now());
    if (!session) return false;
    if (!session.trustedDeviceTokenHash) return true;
    if (!normalizedHash || normalizedHash !== session.trustedDeviceTokenHash) return false;
    return record.trustedDevices.some((device) => device.tokenHash === normalizedHash && device.expiresAt > now());
  };

  const registerTrustedDevice = async (tokenHash: string, ttlMs: number) => {
    const normalizedTokenHash = tokenHash.trim();
    if (!normalizedTokenHash) throw new Error("Trusted device token hash is required.");
    const nextTtl = Number.isFinite(ttlMs) && ttlMs > 0 ? Math.floor(ttlMs) : 30 * 24 * 60 * 60 * 1000;
    return runExclusive(async () => {
      const record = await read();
      const createdAt = new Date().toISOString();
      const expiresAt = now() + nextTtl;
      const nextDevice: TrustedDeviceRecord = {
        tokenHash: normalizedTokenHash,
        createdAt,
        expiresAt,
        lastUsedAt: createdAt
      };
      const existing = record.trustedDevices.filter((item) => item.tokenHash !== normalizedTokenHash);
      await save({
        ...record,
        trustedDevices: [...existing, nextDevice]
      });
    });
  };

  const touchTrustedDevice = async (tokenHash: string) => {
    const normalizedTokenHash = tokenHash.trim();
    if (!normalizedTokenHash) return;
    await runExclusive(async () => {
      const record = await read();
      const nowIso = new Date().toISOString();
      let changed = false;
      const trustedDevices = record.trustedDevices.map((device) => {
        if (device.tokenHash !== normalizedTokenHash) return device;
        changed = true;
        return { ...device, lastUsedAt: nowIso };
      });
      if (!changed) return;
      await save({ ...record, trustedDevices });
    });
  };

  const hasTrustedDevice = async (tokenHash: string) => {
    const normalizedTokenHash = tokenHash.trim();
    if (!normalizedTokenHash) return false;
    const record = await read();
    return record.trustedDevices.some((device) => device.tokenHash === normalizedTokenHash && device.expiresAt > now());
  };

  const clearTrustedDevices = async () => {
    await runExclusive(async () => {
      const record = await read();
      await save({ ...record, trustedDevices: [] });
    });
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
      timezone: record.owner.timezone
    };
  };

  const updateAccountSettings = async (settings: {
    fullName: string;
    timezone: string;
  }) => {
    return runExclusive(async () => {
      const record = await read();
      if (!record.owner) throw new Error("Owner account not created yet.");
      const nextOwner: OwnerRecord = {
        ...record.owner,
        fullName: settings.fullName.trim() || "Boss Admin",
        // Single-owner identity is immutable after initial owner setup.
        email: record.owner.email,
        role: record.owner.role || "Owner",
        timezone: settings.timezone.trim() || "UTC"
      };
      await save({ ...record, owner: nextOwner });
      return {
        fullName: nextOwner.fullName,
        email: nextOwner.email,
        role: nextOwner.role,
        timezone: nextOwner.timezone
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
        trustedDevices: [],
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
    startLogin,
    verifySession,
    verifySessionForDevice,
    registerTrustedDevice,
    touchTrustedDevice,
    hasTrustedDevice,
    clearTrustedDevices,
    logout,
    logoutAll,
    getAccountSettings,
    updateAccountSettings,
    changePassword
  };
};
