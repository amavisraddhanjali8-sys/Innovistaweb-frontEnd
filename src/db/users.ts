import { desc, eq, inArray, or, sql } from "drizzle-orm";
import { db, markDatabaseOffline, isMemoryFallbackActive } from "./index.ts";
import { getMemoryStore, type MemoryUserRecord } from "./memoryStore.ts";
import { users } from "./schema.ts";

export interface UpsertUserOptions {
  name?: string;
  username?: string;
  role?: "admin" | "staff" | "customer";
  avatarUrl?: string;
  phone?: string;
  company?: string;
  isVerified?: boolean;
  emailVerified?: boolean;
}

function getOrCreateUserInMemory(
  uid: string,
  email: string,
  options: UpsertUserOptions = {}
) {
  const store = getMemoryStore();
  const cleanEmail = email.trim().toLowerCase();
  const existing = store.users.find(
    (u) => u.email.toLowerCase() === cleanEmail || u.uid === uid
  );
  const now = new Date();
  if (existing) {
    existing.uid = uid;
    existing.name = options.name?.trim() || existing.name;
    existing.avatarUrl = options.avatarUrl || existing.avatarUrl;
    if (options.emailVerified !== undefined) {
      existing.emailVerified = options.emailVerified;
    }
    existing.updatedAt = now;
    return existing;
  }
  const defaultName =
    options.name?.trim() || cleanEmail.split("@")[0] || "Innovista User";
  const created: MemoryUserRecord = {
    id: store.nextUserId++,
    uid,
    username: options.username?.trim().toLowerCase() || null,
    email: cleanEmail,
    name: defaultName,
    role: options.role || "customer",
    phone: options.phone || "",
    company: options.company || "",
    passwordHash: null,
    avatarUrl: options.avatarUrl || "",
    isVerified: options.isVerified ?? false,
    emailVerified: options.emailVerified ?? false,
    accountStatus: "ACTIVE",
    emailVerificationTokenHash: null,
    emailVerificationCodeHash: null,
    emailVerificationExpiresAt: null,
    totpSecretEncrypted: null,
    totpEnabled: false,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: now,
    lastLoginIp: "",
    isActive: true,
    purchaseGoods: [],
    createdAt: now,
    updatedAt: now,
  };
  store.users.push(created);
  return created;
}

export async function getOrCreateUser(
  uid: string,
  email: string,
  options: UpsertUserOptions = {}
) {
  if (isMemoryFallbackActive()) {
    return getOrCreateUserInMemory(uid, email, options);
  }
  try {
    const cleanEmail = email.trim().toLowerCase();
    const existingByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    if (existingByEmail.length > 0) {
      const current = existingByEmail[0];
      const updated = await db
        .update(users)
        .set({
          uid,
          name: options.name?.trim() || current.name,
          avatarUrl: options.avatarUrl || current.avatarUrl,
          ...(options.emailVerified ? { emailVerified: true } : {}),
          updatedAt: new Date(),
        })
        .where(eq(users.id, current.id))
        .returning();
      return updated[0];
    }

    const defaultName =
      options.name?.trim() || cleanEmail.split("@")[0] || "Innovista User";

    const result = await db
      .insert(users)
      .values({
        uid,
        username: options.username?.trim().toLowerCase() || null,
        email: cleanEmail,
        name: defaultName,
        role: options.role || "customer",
        phone: options.phone || "",
        company: options.company || "",
        avatarUrl: options.avatarUrl || "",
        isVerified: options.isVerified ?? false,
        emailVerified: options.emailVerified ?? false,
        accountStatus: "ACTIVE",
        isActive: true,
        purchaseGoods: [],
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: cleanEmail,
          name: defaultName,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    markDatabaseOffline(error);
    return getOrCreateUserInMemory(uid, email, options);
  }
}

export async function getUsers() {
  if (isMemoryFallbackActive()) {
    return [...getMemoryStore().users].sort((a, b) => b.id - a.id);
  }
  try {
    return await db.select().from(users).orderBy(desc(users.id));
  } catch (error) {
    markDatabaseOffline(error);
    return [...getMemoryStore().users].sort((a, b) => b.id - a.id);
  }
}

export async function getAdminAndStaffUsers() {
  if (isMemoryFallbackActive()) {
    return getMemoryStore()
      .users.filter((u) => u.role === "admin" || u.role === "staff")
      .sort((a, b) => a.id - b.id);
  }
  try {
    return await db
      .select()
      .from(users)
      .where(inArray(users.role, ["admin", "staff"]))
      .orderBy(users.id);
  } catch (error) {
    markDatabaseOffline(error);
    return getMemoryStore()
      .users.filter((u) => u.role === "admin" || u.role === "staff")
      .sort((a, b) => a.id - b.id);
  }
}

export async function getCustomerUsers() {
  if (isMemoryFallbackActive()) {
    return getMemoryStore()
      .users.filter((u) => u.role === "customer")
      .sort((a, b) => a.id - b.id);
  }
  try {
    return await db
      .select()
      .from(users)
      .where(eq(users.role, "customer"))
      .orderBy(users.id);
  } catch (error) {
    markDatabaseOffline(error);
    return getMemoryStore()
      .users.filter((u) => u.role === "customer")
      .sort((a, b) => a.id - b.id);
  }
}

export async function findUserByEmail(email: string) {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return null;
  if (isMemoryFallbackActive()) {
    return getMemoryStore().users.find((u) => u.email.toLowerCase() === cleanEmail) || null;
  }
  try {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);
    return rows[0] || null;
  } catch (error) {
    markDatabaseOffline(error);
    return getMemoryStore().users.find((u) => u.email.toLowerCase() === cleanEmail) || null;
  }
}

export async function findUserById(id: number) {
  if (!Number.isFinite(id)) return null;
  if (isMemoryFallbackActive()) {
    return getMemoryStore().users.find((u) => u.id === id) || null;
  }
  try {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] || null;
  } catch (error) {
    markDatabaseOffline(error);
    return getMemoryStore().users.find((u) => u.id === id) || null;
  }
}

export async function findUserByIdentifier(identifier: string) {
  const raw = String(identifier || "").trim();
  if (!raw) return null;
  const clean = raw.toLowerCase();
  const numericId = /^\d+$/.test(clean) ? Number(clean) : null;

  if (isMemoryFallbackActive()) {
    return (
      getMemoryStore().users.find(
        (u) =>
          u.email.toLowerCase() === clean ||
          (u.username && u.username.toLowerCase() === clean) ||
          u.uid.toLowerCase() === clean ||
          (numericId !== null && u.id === numericId)
      ) || null
    );
  }

  try {
    const conditions = [
      sql`lower(${users.email}) = ${clean}`,
      sql`lower(coalesce(${users.username}, '')) = ${clean}`,
      sql`lower(${users.uid}) = ${clean}`,
    ];
    if (numericId !== null) {
      conditions.push(eq(users.id, numericId));
    }
    const rows = await db
      .select()
      .from(users)
      .where(or(...conditions))
      .limit(1);
    return rows[0] || null;
  } catch (error) {
    markDatabaseOffline(error);
    return (
      getMemoryStore().users.find(
        (u) =>
          u.email.toLowerCase() === clean ||
          (u.username && u.username.toLowerCase() === clean) ||
          u.uid.toLowerCase() === clean ||
          (numericId !== null && u.id === numericId)
      ) || null
    );
  }
}

export async function hasAnyAdminUser(): Promise<boolean> {
  const admins = await getAdminAndStaffUsers();
  return admins.length > 0;
}
