import { desc, eq, inArray } from "drizzle-orm";
import { db } from "./index.ts";
import { users } from "./schema.ts";

export interface UpsertUserOptions {
  name?: string;
  role?: "admin" | "staff" | "customer";
  avatarUrl?: string;
  phone?: string;
  company?: string;
  isVerified?: boolean;
}

export async function getOrCreateUser(
  uid: string,
  email: string,
  options: UpsertUserOptions = {}
) {
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
    console.error("Failed to upsert user:", error);
    throw new Error("Database query failed while syncing user.", { cause: error });
  }
}

export async function getUsers() {
  try {
    return await db.select().from(users).orderBy(desc(users.id));
  } catch (error) {
    console.error("Failed to fetch users:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function getAdminAndStaffUsers() {
  try {
    return await db
      .select()
      .from(users)
      .where(inArray(users.role, ["admin", "staff"]))
      .orderBy(users.id);
  } catch (error) {
    console.error("Failed to fetch admin/staff users:", error);
    throw new Error("Database query failed while loading admin accounts.", {
      cause: error,
    });
  }
}

export async function getCustomerUsers() {
  try {
    return await db
      .select()
      .from(users)
      .where(eq(users.role, "customer"))
      .orderBy(users.id);
  } catch (error) {
    console.error("Failed to fetch customers:", error);
    throw new Error("Database query failed while loading customers.", {
      cause: error,
    });
  }
}

export async function findUserByEmail(email: string) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);
    return rows[0] || null;
  } catch (error) {
    console.error("Failed to lookup user by email:", error);
    throw new Error("Database query failed during user lookup.", { cause: error });
  }
}
