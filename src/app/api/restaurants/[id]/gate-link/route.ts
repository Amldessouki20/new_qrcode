import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from '@/lib/jwt';
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";




const linkGateSchema = z.object({
  gateId: z.string().min(1, "Gate ID is required"),
});

// POST /api/restaurants/[id]/gate-link - Link restaurant to gate
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: restaurantId } = await params;
    const token = request.cookies.get("accessToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: "رمز غير صحيح" }, { status: 401 });
    }

    if (!(await hasPermission(payload.userId, PERMISSIONS.RESTAURANT_UPDATE))) {
      return NextResponse.json(
        { error: "ليس لديك صلاحية لتحديث المطاعم" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { gateId } = linkGateSchema.parse(body);

    // Check if restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "المطعم غير موجود" }, { status: 404 });
    }

    // Check if gate exists
    const gate = await prisma.gate.findUnique({
      where: { id: gateId },
    });

    if (!gate) {
      return NextResponse.json(
        { error: "البوابة غير موجودة" },
        { status: 404 }
      );
    }

    // Check if gate is active
    if (!gate.isActive) {
      return NextResponse.json({ error: "البوابة غير نشطة" }, { status: 400 });
    }

    // Check if restaurant is already linked to this gate
    if (restaurant.gateId === gateId) {
      return NextResponse.json({
        message: "المطعم مربوط بالفعل بهذه البوابة",
        alreadyLinked: true,
      });
    }

    // Check if restaurant is linked to another gate
    if (restaurant.gateId && restaurant.gateId !== gateId) {
      return NextResponse.json(
        {
          error: "المطعم مربوط ببوابة أخرى. يرجى إلغاء الربط أولاً",
        },
        { status: 400 }
      );
    }

    // Link restaurant to gate
    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { gateId },
      include: {
        gate: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            type: true,
            location: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "تم ربط المطعم بالبوابة بنجاح",
      restaurant: updatedRestaurant,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "بيانات غير صحيحة",
          details: error,
        },
        { status: 400 }
      );
    }

    console.error("Error linking restaurant to gate:", error);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

// DELETE /api/restaurants/[id]/gate-link - Unlink restaurant from gate
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: restaurantId } = await params;
    const token = request.cookies.get("accessToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: "رمز غير صحيح" }, { status: 401 });
    }

    if (!(await hasPermission(payload.userId, PERMISSIONS.RESTAURANT_UPDATE))) {
      return NextResponse.json(
        { error: "ليس لديك صلاحية لتحديث المطاعم" },
        { status: 403 }
      );
    }

    // Check if restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        gate: {
          select: {
            id: true,
            name: true,
            nameAr: true,
          },
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "المطعم غير موجود" }, { status: 404 });
    }

    if (!restaurant.gateId) {
      return NextResponse.json({
        message: "المطعم غير مربوط بأي بوابة",
        alreadyUnlinked: true,
      });
    }

    // Unlink restaurant from gate
    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { gateId: null },
      include: {
        gate: true,
      },
    });

    return NextResponse.json({
      message: `تم إلغاء ربط المطعم من بوابة ${
        restaurant.gate?.nameAr || restaurant.gate?.name
      }`,
      restaurant: updatedRestaurant,
    });
  } catch (error) {
    console.error("Error unlinking restaurant from gate:", error);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

// GET /api/restaurants/[id]/gate-link - Get current gate link
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: restaurantId } = await params;
    const token = request.cookies.get("accessToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: "رمز غير صحيح" }, { status: 401 });
    }

    if (!(await hasPermission(payload.userId, PERMISSIONS.RESTAURANT_READ))) {
      return NextResponse.json(
        { error: "ليس لديك صلاحية لعرض المطاعم" },
        { status: 403 }
      );
    }

    // Get restaurant with gate information
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        nameAr: true,
        gateId: true,
        gate: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            type: true,
            location: true,
            isActive: true,
            status: true,
          },
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "المطعم غير موجود" }, { status: 404 });
    }

    return NextResponse.json({
      restaurant,
      isLinked: !!restaurant.gateId,
      gate: restaurant.gate,
    });
  } catch (error) {
    console.error("Error getting restaurant gate link:", error);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
