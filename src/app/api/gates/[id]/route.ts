import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/jwt';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { z } from 'zod';




const updateGateSchema = z.object({
  name: z.string().min(1, 'اسم البوابة مطلوب').optional(),
//   nameAr: z.string().min(1, 'الاسم العربي مطلوب').optional(),
  gateType: z.string().optional(),
  gateTypeAr: z.string().optional(),
  location: z.string().min(1, 'موقع البوابة مطلوب').optional(),
  ipAddress: z.string().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, 'عنوان IP غير صحيح').optional(),
  port: z.number().min(1).max(65535).optional(),
  serialPort: z.string().optional(),
  baudRate: z.number().optional(),
  protocolName: z.string().optional(),
  protocolNameAr: z.string().optional(),
  model: z.string().optional(),
  maxCapacity: z.number().min(1).optional(),
  isActive: z.boolean().optional(),
  description: z.string().optional(),
});

// GET /api/gates/[id] - Get single gate
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('accessToken')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'رمز غير صحيح' }, { status: 401 });
    }

    if (!(await hasPermission(payload.userId, PERMISSIONS.GATE_VIEW))) {
      return NextResponse.json({ error: 'ليس لديك صلاحية لعرض البوابات' }, { status: 403 });
    }

    const gate = await prisma.gate.findUnique({
      where: { id },
      include: {
        restaurants: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            location: true,
            isActive: true
          }
        },
        accessLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            guest: {
              select: {
                firstName: true,
                lastName: true,
                roomNumber: true
              }
            }
          }
        },
        createdBy: {
          select: {
            id: true,
            username: true
          }
        },
        _count: {
          select: {
            restaurants: true,
            accessLogs: true
          }
        }
      }
    });

    if (!gate) {
      return NextResponse.json({ error: 'البوابة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ gate });

  } catch (error) {
    console.error('Error fetching gate:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}

// PUT /api/gates/[id] - Update gate
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('accessToken')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'رمز غير صحيح' }, { status: 401 });
    }

    if (!(await hasPermission(payload.userId, PERMISSIONS.GATE_UPDATE))) {
      return NextResponse.json({ error: 'ليس لديك صلاحية لتحديث البوابات' }, { status: 403 });
    }

    const existingGate = await prisma.gate.findUnique({
      where: { id }
    });

    if (!existingGate) {
      return NextResponse.json({ error: 'البوابة غير موجودة' }, { status: 404 });
    }

    const body = await request.json();
    const parsedData = updateGateSchema.parse(body);
    
    // Filter out undefined values for exactOptionalPropertyTypes compatibility
    const validatedData = Object.fromEntries(
      Object.entries(parsedData).filter(([, value]) => value !== undefined)
    );

    // Type validation removed as it's handled by gateType field

    // Check for duplicate IP address if changed
    if (validatedData.ipAddress && validatedData.ipAddress !== existingGate.ipAddress) {
      const duplicateGate = await prisma.gate.findFirst({
        where: { 
          ipAddress: validatedData.ipAddress as string,
          port: (validatedData.port as number) || existingGate.port,
          id: { not: id }
        }
      });

      if (duplicateGate) {
        return NextResponse.json({ 
          error: 'يوجد بالفعل بوابة بنفس عنوان IP والمنفذ' 
        }, { status: 400 });
      }
    }

    const updatedGate = await prisma.gate.update({
      where: { id },
      data: validatedData,
      include: {
        restaurants: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            location: true
          }
        },
        createdBy: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    return NextResponse.json({ 
      message: 'تم تحديث البوابة بنجاح',
      gate: updatedGate 
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'بيانات غير صحيحة',
        details: error.issues 
      }, { status: 400 });
    }

    console.error('Error updating gate:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}

// DELETE /api/gates/[id] - Delete gate
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('accessToken')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'رمز غير صحيح' }, { status: 401 });
    }

    if (!(await hasPermission(payload.userId, PERMISSIONS.GATE_DELETE))) {
      return NextResponse.json({ error: 'ليس لديك صلاحية لحذف البوابات' }, { status: 403 });
    }

    const gate = await prisma.gate.findUnique({
      where: { id },
      include: {
        restaurants: true,
        accessLogs: true
      }
    });

    if (!gate) {
      return NextResponse.json({ error: 'البوابة غير موجودة' }, { status: 404 });
    }

    // Check if gate has linked restaurants
    if (gate.restaurants.length > 0) {
      return NextResponse.json({ 
        error: `لا يمكن حذف البوابة لأنها مرتبطة بـ ${gate.restaurants.length} مطعم. يرجى إلغاء الربط أولاً.` 
      }, { status: 400 });
    }

    // Soft delete to preserve access logs
    await prisma.gate.update({
      where: { id },
      data: { 
        isActive: false
      }
    });

    return NextResponse.json({ 
      message: 'تم حذف البوابة بنجاح' 
    });

  } catch (error) {
    console.error('Error deleting gate:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
