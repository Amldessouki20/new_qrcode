import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/jwt";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";




// DELETE /api/gates/[id]/restaurants/[restaurantId] - Unlink specific restaurant from gate
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; restaurantId: string }> }
) {
  try {
    const { id: gateId, restaurantId } = await params;
    const token = request.cookies.get("accessToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: "رمز غير صحيح" }, { status: 401 });
    }

    if (!(await hasPermission(payload.userId, PERMISSIONS.GATE_UPDATE))) {
      return NextResponse.json(
        { error: "ليس لديك صلاحية لتحديث البوابات" },
        { status: 403 }
      );
    }

    // Check if gate exists
    const gate = await prisma.gate.findUnique({
      where: { id: gateId },
      select: {
        id: true,
        name: true,
        nameAr: true,
      },
    });

    if (!gate) {
      return NextResponse.json(
        { error: "البوابة غير موجودة" },
        { status: 404 }
      );
    }

    // Check if restaurant exists and is linked to this gate
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        nameAr: true,
        gateId: true,
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "المطعم غير موجود" }, { status: 404 });
    }

    if (!restaurant.gateId || restaurant.gateId !== gateId) {
      return NextResponse.json(
        { error: "المطعم غير مربوط بهذه البوابة" },
        { status: 400 }
      );
    }

    // Unlink restaurant from gate
    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { gateId: null },
      select: {
        id: true,
        name: true,
        nameAr: true,
        gateId: true,
      },
    });

    return NextResponse.json({
      message: `تم إلغاء ربط مطعم ${
        restaurant.nameAr || restaurant.name
      } من بوابة ${gate.nameAr || gate.name}`,
      restaurant: updatedRestaurant,
      gate: gate,
    });
  } catch (error) {
    console.error("Error unlinking restaurant from gate:", error);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

// GET /api/gates/[id]/restaurants/[restaurantId] - Check if restaurant is linked to gate
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; restaurantId: string }> }
) {
  try {
    const { id: gateId, restaurantId } = await params;
    const token = request.cookies.get("accessToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: "رمز غير صحيح" }, { status: 401 });
    }

    if (!(await hasPermission(payload.userId, PERMISSIONS.GATE_READ))) {
      return NextResponse.json(
        { error: "ليس لديك صلاحية لعرض البوابات" },
        { status: 403 }
      );
    }

    // Check if gate exists
    const gate = await prisma.gate.findUnique({
      where: { id: gateId },
      select: {
        id: true,
        name: true,
        nameAr: true,
      },
    });

    if (!gate) {
      return NextResponse.json(
        { error: "البوابة غير موجودة" },
        { status: 404 }
      );
    }

    // Check if restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        nameAr: true,
        gateId: true,
        location: true,
        capacity: true,
        restaurantType: true,
        isActive: true,
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "المطعم غير موجود" }, { status: 404 });
    }

    const isLinked = restaurant.gateId === gateId;

    return NextResponse.json({
      isLinked,
      restaurant,
      gate,
      linkStatus: isLinked ? "مربوط" : "غير مربوط",
    });
  } catch (error) {
    console.error("Error checking restaurant-gate link:", error);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
