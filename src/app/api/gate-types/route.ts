import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/jwt";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = 'force-dynamic';


// GET /api/gate-types - List all gate types
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: "رمز غير صحيح" }, { status: 401 });
    }

    if (!(await hasPermission(payload.userId, PERMISSIONS.GATE_LIST))) {
      return NextResponse.json(
        { error: "ليس لديك صلاحية لعرض أنواع البوابات" },
        { status: 403 }
      );
    }

    const gateTypes = await prisma.gateType.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      data: gateTypes
    });

  } catch (error) {
    console.error("Error fetching gate types:", error);
    return NextResponse.json(
      { error: "حدث خطأ في جلب أنواع البوابات" },
      { status: 500 }
    );
  }
}