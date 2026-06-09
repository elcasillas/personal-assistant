import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "linda_session";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type UserRole = "admin" | "user";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

function secret(): Uint8Array {
  return new TextEncoder().encode(process.env.AUTH_SECRET ?? "change-this-in-production");
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ sub: user.id, email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}

export function getSessionFromHeaders(headers: Headers): SessionUser | null {
  const id = headers.get("x-user-id");
  if (!id) return null;
  return {
    id,
    email: headers.get("x-user-email") ?? "",
    name: headers.get("x-user-name") ?? "",
    role: (headers.get("x-user-role") ?? "user") as UserRole,
  };
}
