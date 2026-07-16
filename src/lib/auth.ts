import bcrypt from 'bcryptjs';
import { prisma } from './db';
import { cookies, headers } from 'next/headers';
import crypto from 'crypto';

// Session cookie configuration
export const SESSION_COOKIE_NAME = 'eventelligence_session_v2';
export const SESSION_DURATION_DAYS = 7;

/**
 * Hashes password using bcryptjs.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compares plain text password with hashed value.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Creates a new session in the database and returns the secure token.
 */
export async function createSession(userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt
    }
  });

  return token;
}

/**
 * Resolves user from active session cookie.
 */
export async function getSessionUser() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) return null;

    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: {
        user: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!session) return null;

    // Check expiration
    if (new Date() > session.expiresAt) {
      // Clean up expired session
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    // Return the user along with a simplified list of permissions
    const permissions = session.user.role.permissions.map(rp => rp.permission.name);
    
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      status: session.user.status,
      role: {
        id: session.user.role.id,
        name: session.user.role.name
      },
      permissions
    };
  } catch (err) {
    console.error('Failed to get session user:', err);
    return null;
  }
}

/**
 * Checks if a user has a specific permission.
 * Note: 'Super Admin' has all permissions by default.
 */
export function hasPermission(user: any, permissionName: string): boolean {
  if (!user) return false;
  if (user.role?.name === 'Super Admin') return true;
  return user.permissions?.includes(permissionName) ?? false;
}

/**
 * Checks if a user has any of the specified permissions.
 */
export function hasAnyPermission(user: any, permissionNames: string[]): boolean {
  if (!user) return false;
  if (user.role?.name === 'Super Admin') return true;
  return permissionNames.some(p => user.permissions?.includes(p));
}

/**
 * Destroys current session from cookie and database.
 */
export async function destroySession() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (sessionToken) {
      await prisma.session.delete({ where: { token: sessionToken } }).catch(() => {});
    }

    const host = (await headers()).get('host') || '';
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('192.168.');
    const secure = process.env.NODE_ENV === 'production' && !isLocalhost;

    cookieStore.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      expires: new Date(0),
      path: '/'
    });
  } catch (err) {
    console.error('Failed to destroy session:', err);
  }
}
