import { desc, eq, inArray } from "drizzle-orm";
import { db, markDatabaseOffline, isMemoryFallbackActive } from "./index.ts";
import { getMemoryStore } from "./memoryStore.ts";
import { users } from "./schema.ts";

export interface UpsertUserOptions {
  name?: string;
  role?: "admin" | "staff" | "customer";
  avatarUrl?: string;
  phone?: string;
  company?: string;
  isVerified?: boolean;
}

function getOrCreateUserInMemory(
  uid: string,
  email: string,
  options: UpsertUserOptions = {}
) {
  const store = getMemoryStore();
  const cleanEmail = email.trim().toLowerCase();
  const existing = store.users.find((u) => u.email.toLowerCase() === cleanEmail || u.uid === uid);
  const now = new Date();
  if (existing) {
    existing.uid = uid;
    existing.name = options.name?.trim() || existing.name;
    existing.avatarUrl = options.avatarUrl || existing.avatarUrl;
    existing.updatedAt = now;
    return existing;
  }
  const defaultName =
    options.name?.trim() || cleanEmail.split("@")[0] || "Innovista User";
  const created = {
    id: store.nextUserId++,
    uid,
    email: cleanEmail,
    name: defaultName,
    role: options.role || "customer",
    phone: options.phone || "",
    company: options.company || "",
    passwordHash: null,
    avatarUrl: options.avatarUrl || "/assets/logos/client-zenith.svg",
    isVerified: options.isVerified ?? true,
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
          updatedAt: new Date(),
        })
        .where(eq(users.id, current.id))
        .returning();
      return updated[0];
    }

    const defaultName =
      options.name?.trim() ||
      cleanEmail.split("@")[0] ||
      "Innovista User";

    const result = await db
      .insert(users)
      .values({
        uid,
        email: cleanEmail,
        name: defaultName,
        role: options.role || "customer",
        phone: options.phone || "",
        company: options.company || "",
        avatarUrl: options.avatarUrl || "/assets/logos/client-zenith.svg",
        isVerified: options.isVerified ?? true,
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
