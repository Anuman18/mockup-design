import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, hasPermission } from '@/lib/auth';

/**
 * GET: Returns all roles, their mapping to permissions, and all system permissions.
 * Required Permission: 'Read'
 */
export async function GET() {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser || !hasPermission(currentUser, 'Read')) {
      return NextResponse.json({ error: 'Unauthorized. Read permission required.' }, { status: 403 });
    }

    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          select: {
            permissionId: true
          }
        }
      }
    });

    const permissions = await prisma.permission.findMany();

    // Map roles to simplify UI consumption
    const formattedRoles = roles.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      permissionIds: r.permissions.map(p => p.permissionId)
    }));

    return NextResponse.json({ roles: formattedRoles, permissions });

  } catch (err: any) {
    console.error('List roles error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST: Saves permissions mapping edits for a role.
 * Required Permission: 'Update'
 */
export async function POST(request: Request) {
  try {
    const currentUser = await getSessionUser();
    // Re-configuring system security policies requires 'Update' permission.
    if (!currentUser || !hasPermission(currentUser, 'Update')) {
      return NextResponse.json({ error: 'Unauthorized. Update permission required.' }, { status: 403 });
    }

    const { roleId, permissionIds } = await request.json();

    if (!roleId || !Array.isArray(permissionIds)) {
      return NextResponse.json({ error: 'roleId and permissionIds list are required' }, { status: 400 });
    }

    const roleIdInt = parseInt(roleId, 10);
    const targetRole = await prisma.role.findUnique({ where: { id: roleIdInt } });
    if (!targetRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Safety check: Prevent stripping all permissions from Super Admin role
    if (targetRole.name === 'Super Admin' && permissionIds.length === 0) {
      return NextResponse.json({ error: 'Cannot remove all permissions from Super Admin' }, { status: 400 });
    }

    // Execute in transaction: Delete old mappings and insert new ones
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({
        where: { roleId: roleIdInt }
      }),
      prisma.rolePermission.createMany({
        data: permissionIds.map((pId: number) => ({
          roleId: roleIdInt,
          permissionId: pId
        }))
      })
    ]);

    // Query updated role permissions
    const updatedRole = await prisma.role.findUnique({
      where: { id: roleIdInt },
      include: {
        permissions: {
          select: {
            permissionId: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      role: {
        id: updatedRole?.id,
        name: updatedRole?.name,
        permissionIds: updatedRole?.permissions.map(p => p.permissionId)
      }
    });

  } catch (err: any) {
    console.error('Update role permissions error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
