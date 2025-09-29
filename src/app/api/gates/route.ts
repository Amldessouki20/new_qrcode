import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/jwt";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";
import { Prisma } from "@prisma/client";




const createGateSchema = z.object({
  name: z.string().min(1, "اسم البوابة مطلوب"),
  nameAr: z.string().min(1, "الاسم العربي مطلوب"),
  typeId: z.string().optional(),
  gateType: z.string().min(1, "نوع البوابة مطلوب"),
  location: z.string().min(1, "موقع البوابة مطلوب"),
  defaultProtocolId: z.string().optional(),
  protocolName: z.string().optional(),
  protocolNameAr: z.string().optional(),
  ipAddress: z.string().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, "عنوان IP غير صحيح").optional(),
  port: z
    .number()
    .min(1)
    .max(65535, "رقم المنفذ يجب أن يكون بين 1 و 65535")
    .optional(),
  serialPort: z.string().optional(),
  baudRate: z.number().optional().default(9600),
  model: z.string().optional().default(''),
  maxCapacity: z.number().min(1).optional().default(30),
  isActive: z.boolean().default(true),
  description: z.string().optional(),
}).refine((data) => {
  // إذا لم يتم تحديد بروتوكول من القائمة، فيجب إدخال اسم البروتوكول
  if (!data.defaultProtocolId) {
    return data.protocolName && data.protocolName.length > 0;
  }
  return true;
}, {
  message: "بروتوكول الاتصال مطلوب",
  path: ["protocolName"]
});

// GET /api/gates - List all gates
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
        { error: "ليس لديك صلاحية لعرض البوابات" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || undefined;

    const skip = (page - 1) * limit;

    // Build search filter
    const where: Prisma.GateWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { nameAr: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
      ];
    }

    if (type) {
      where.type = {
        name: type
      };
    }

    const [gates, totalCount] = await Promise.all([
      prisma.gate.findMany({
        where,
        select: {
          id: true,
          name: true,
          nameAr: true,
          ipAddress: true,
          port: true,
          isActive: true,
          status: true,
          description: true,
          createdAt: true,
          type: {
            select: {
              id: true,
              name: true
            }
          },
          defaultProtocol: {
            select: {
              id: true,
              name: true
            }
          },
          restaurants: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              location: true,
            },
          },
          _count: {
            select: {
              restaurants: true,
              accessLogs: true,
            },
          },
        },
        orderBy: [
          { type: { name: "asc" } }, // MAIN gates first
          { createdAt: "desc" },
        ],
        skip,
        take: limit,
      }),
      prisma.gate.count({ where }),
    ]);

    return NextResponse.json({
      gates,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching gates:", error);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

// POST /api/gates - Create new gate
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: "رمز غير صحيح" }, { status: 401 });
    }

    if (!(await hasPermission(payload.userId, PERMISSIONS.GATE_CREATE))) {
      return NextResponse.json(
        { error: "ليس لديك صلاحية لإنشاء البوابات" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createGateSchema.parse(body);

    // Optional: Verify that the gate type exists if typeId is provided
    if (validatedData.typeId) {
      const gateType = await prisma.gateType.findUnique({
        where: { id: validatedData.typeId },
      });

      if (!gateType) {
        return NextResponse.json(
          { error: "نوع البوابة المحدد غير موجود" },
          { status: 400 }
        );
      }

      // Check if main gate already exists (only one main gate allowed)
      if (gateType.name === "MAIN") {
        const existingMainGate = await prisma.gate.findFirst({
          where: { type: { name: "MAIN" } },
        });

        if (existingMainGate) {
          return NextResponse.json(
            {
              error:
                "يوجد بالفعل بوابة رئيسية في النظام. يمكن وجود بوابة رئيسية واحدة فقط.",
            },
            { status: 400 }
          );
        }
      }
    }

    // Check for duplicate IP address if provided
    if (validatedData.ipAddress) {
      const whereClause: Prisma.GateWhereInput = {
        ipAddress: validatedData.ipAddress,
      };
      if (validatedData.port !== undefined) {
        whereClause.port = validatedData.port;
      }
      
      const existingGate = await prisma.gate.findFirst({
        where: whereClause,
      });

      if (existingGate) {
        return NextResponse.json(
          {
            error: "يوجد بالفعل بوابة بنفس عنوان IP والمنفذ",
          },
          { status: 400 }
        );
      }
    }

    // Validate typeId if provided
    let finalTypeId = null;
    if (validatedData.typeId) {
      const gateType = await prisma.gateType.findUnique({
        where: { id: validatedData.typeId }
      });
      if (gateType) {
        finalTypeId = validatedData.typeId;
      }
    }

    // Validate defaultProtocolId if provided
    let finalProtocolId = null;
    if (validatedData.defaultProtocolId) {
      const protocol = await prisma.gateProtocol.findUnique({
        where: { id: validatedData.defaultProtocolId }
      });
      if (protocol) {
        finalProtocolId = validatedData.defaultProtocolId;
      }
    }

    const gateData: Prisma.GateCreateInput = {
      name: validatedData.name,
      nameAr: validatedData.nameAr,
      gateType: validatedData.gateType,
      location: validatedData.location,
      isActive: validatedData.isActive,
      createdBy: { connect: { id: payload.userId } },
    };

    // Add optional properties only if they are not undefined
    if (finalTypeId !== null) gateData.type = { connect: { id: finalTypeId } };
    if (finalProtocolId !== null) gateData.defaultProtocol = { connect: { id: finalProtocolId } };
    if (validatedData.protocolName !== undefined) gateData.protocolName = validatedData.protocolName;
    // if (validatedData.protocolNameAr !== undefined) gateData.protocolNameAr = validatedData.protocolNameAr;
    if (validatedData.ipAddress !== undefined) gateData.ipAddress = validatedData.ipAddress;
    if (validatedData.port !== undefined) gateData.port = validatedData.port;
    if (validatedData.serialPort !== undefined) gateData.serialPort = validatedData.serialPort;
    if (validatedData.baudRate !== undefined) gateData.baudRate = validatedData.baudRate;
    if (validatedData.model !== undefined) gateData.model = validatedData.model;
    if (validatedData.maxCapacity !== undefined) gateData.maxCapacity = validatedData.maxCapacity;
    if (validatedData.description !== undefined) gateData.description = validatedData.description;

    const gate = await prisma.gate.create({
      data: gateData,
      include: {
        type: true,
        defaultProtocol: true,
        restaurants: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            location: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "تم إنشاء البوابة بنجاح",
        gate,
      },
      { status: 201 }
    );
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

    console.error("Error creating gate:", error);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
