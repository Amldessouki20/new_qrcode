import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/jwt";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";




// GET /api/gates/[id]/restaurants - Get restaurants linked to a gate
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gateId } = await params;
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

    // Get gate with linked restaurants
    const gate = await prisma.gate.findUnique({
      where: { id: gateId },
      select: {
        id: true,
        name: true,
        nameAr: true,
        type: true,
        location: true,
        isActive: true,
        status: true,
        restaurants: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            location: true,
            capacity: true,
            restaurantType: true,
            isActive: true,
          },
        },
      },
    });

    if (!gate) {
      return NextResponse.json(
        { error: "البوابة غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      gate,
      linkedRestaurants: gate.restaurants,
      totalLinked: gate.restaurants.length,
    });
  } catch (error) {
    console.error("Error getting gate restaurants:", error);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

// POST /api/gates/[id]/restaurants - Link multiple restaurants to a gate
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gateId } = await params;
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

    const body = await request.json();
    const { restaurantIds } = body;

    if (!Array.isArray(restaurantIds) || restaurantIds.length === 0) {
      return NextResponse.json(
        { error: "يجب تحديد قائمة بمعرفات المطاعم" },
        { status: 400 }
      );
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

    if (!gate.isActive) {
      return NextResponse.json({ error: "البوابة غير نشطة" }, { status: 400 });
    }

    // Check if all restaurants exist
    const restaurants = await prisma.restaurant.findMany({
      where: {
        id: { in: restaurantIds },
        isActive: true,
      },
    });

    if (restaurants.length !== restaurantIds.length) {
      return NextResponse.json(
        { error: "بعض المطاعم غير موجودة أو غير نشطة" },
        { status: 400 }
      );
    }

    // Check if any restaurant is already linked to another gate
    const alreadyLinked = restaurants.filter(
      (r) => r.gateId && r.gateId !== gateId
    );
    if (alreadyLinked.length > 0) {
      return NextResponse.json(
        {
          error: `المطاعم التالية مربوطة ببوابات أخرى: ${alreadyLinked
            .map((r) => r.nameAr || r.name)
            .join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Link restaurants to gate
    const updateResult = await prisma.restaurant.updateMany({
      where: {
        id: { in: restaurantIds },
      },
      data: {
        gateId: gateId,
      },
    });

    // Get updated restaurants with gate info
    const updatedRestaurants = await prisma.restaurant.findMany({
      where: {
        id: { in: restaurantIds },
      },
      select: {
        id: true,
        name: true,
        nameAr: true,
        location: true,
        capacity: true,
        restaurantType: true,
        gateId: true,
      },
    });

    return NextResponse.json({
      message: `تم ربط ${updateResult.count} مطعم بالبوابة بنجاح`,
      linkedRestaurants: updatedRestaurants,
      gate: {
        id: gate.id,
        name: gate.name,
        nameAr: gate.nameAr,
      },
    });
  } catch (error) {
    console.error("Error linking restaurants to gate:", error);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

// DELETE /api/gates/[id]/restaurants - Unlink all restaurants from a gate
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gateId } = await params;
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
      include: {
        restaurants: {
          select: {
            id: true,
            name: true,
            nameAr: true,
          },
        },
      },
    });

    if (!gate) {
      return NextResponse.json(
        { error: "البوابة غير موجودة" },
        { status: 404 }
      );
    }

    if (gate.restaurants.length === 0) {
      return NextResponse.json({
        message: "البوابة غير مربوطة بأي مطاعم",
        alreadyUnlinked: true,
      });
    }

    // Unlink all restaurants from gate
    const updateResult = await prisma.restaurant.updateMany({
      where: {
        gateId: gateId,
      },
      data: {
        gateId: null,
      },
    });

    return NextResponse.json({
      message: `تم إلغاء ربط ${updateResult.count} مطعم من البوابة`,
      unlinkedRestaurants: gate.restaurants,
      gate: {
        id: gate.id,
        name: gate.name,
        nameAr: gate.nameAr,
      },
    });
  } catch (error) {
    console.error("Error unlinking restaurants from gate:", error);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
