import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, hasPermission, hashPassword } from '@/lib/auth';

/**
 * GET: Lists, searches, and filters users.
 * Required Permission: 'Read'
 */
export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user, 'Read')) {
      return NextResponse.json({ error: 'Unauthorized. Read permission required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const roleId = searchParams.get('roleId') ? parseInt(searchParams.get('roleId') as string, 10) : undefined;
    const status = searchParams.get('status') || '';

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } }
      ];
    }

    if (roleId && !isNaN(roleId)) {
      where.roleId = roleId;
    }

    if (status) {
      where.status = status;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        lastLogin: true,
        createdAt: true,
        role: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Also return list of available roles for filters/selects in UI
    const roles = await prisma.role.findMany({
      select: { id: true, name: true }
    });

    return NextResponse.json({ users, roles });

  } catch (err: any) {
    console.error('List users error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST: Creates a new user.
 * Required Permission: 'Create'
 */
export async function POST(request: Request) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser || !hasPermission(currentUser, 'Create')) {
      return NextResponse.json({ error: 'Unauthorized. Create permission required.' }, { status: 403 });
    }

    const { name, email, password, roleId } = await request.json();

    if (!name || !email || !password || !roleId) {
      return NextResponse.json({ error: 'Name, email, password, and role are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Check duplicate
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        roleId: parseInt(roleId, 10),
        status: 'active'
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        createdAt: true,
        role: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json(newUser, { status: 201 });

  } catch (err: any) {
    console.error('Create user error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PUT: Updates an existing user's name, email, role, status, or password.
 * Required Permission: 'Update'
 */
export async function PUT(request: Request) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser || !hasPermission(currentUser, 'Update')) {
      return NextResponse.json({ error: 'Unauthorized. Update permission required.' }, { status: 403 });
    }

    const { id, name, email, roleId, status, password } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'User id is required' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: parseInt(id, 10) } });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateData: any = {};

    if (name) updateData.name = name;
    if (email) {
      const existing = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          id: { not: parseInt(id, 10) }
        }
      });
      if (existing) {
        return NextResponse.json({ error: 'Email already in use by another user' }, { status: 400 });
      }
      updateData.email = email.toLowerCase();
    }
    if (roleId) updateData.roleId = parseInt(roleId, 10);
    if (status) {
      // Prevent self-suspension
      if (parseInt(id, 10) === currentUser.id && status === 'suspended') {
        return NextResponse.json({ error: 'You cannot suspend your own account' }, { status: 400 });
      }
      updateData.status = status;
    }
    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }
      updateData.passwordHash = await hashPassword(password);
    }

    const updated = await prisma.user.update({
      where: { id: parseInt(id, 10) },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        createdAt: true,
        role: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // If a user gets suspended, force sign them out by deleting all active database sessions
    if (status === 'suspended') {
      await prisma.session.deleteMany({
        where: { userId: parseInt(id, 10) }
      }).catch(() => {});
    }

    return NextResponse.json(updated);

  } catch (err: any) {
    console.error('Update user error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE: Deletes a user.
 * Required Permission: 'Delete'
 */
export async function DELETE(request: Request) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser || !hasPermission(currentUser, 'Delete')) {
      return NextResponse.json({ error: 'Unauthorized. Delete permission required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User id is required' }, { status: 400 });
    }

    const userIdInt = parseInt(id, 10);

    // Prevent self-deletion
    if (userIdInt === currentUser.id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userIdInt } });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id: userIdInt }
    });

    return NextResponse.json({ success: true, message: 'User deleted successfully' });

  } catch (err: any) {
    console.error('Delete user error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
