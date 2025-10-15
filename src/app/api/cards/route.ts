import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/jwt";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { createCardSchema } from "@/lib/validations/guests";
import { generateCardNumber, createCardDataString } from "@/lib/qr-generator";
import { Prisma } from "@prisma/client";

// export const dynamic = 'force-dynamic';



// GET /api/cards - List cards with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Check permissions
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true },
    });

    if (!user || !(await hasPermission(user.id, PERMISSIONS.CARD_LIST))) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 100);
    const search = searchParams.get("search") || "";
    const cardType = searchParams.get("cardType") || "";
    const isActive = searchParams.get("isActive");
    const guestId = searchParams.get("guestId") || "";
    const restaurantId = searchParams.get("restaurantId") || "";

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.CardWhereInput = {};

    if (search) {
      where.OR = [
        { cardData: { contains: search, mode: "insensitive" } },
        { guest: { firstName: { contains: search, mode: "insensitive" } } },
        { guest: { lastName: { contains: search, mode: "insensitive" } } },
        { guest: { company: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (cardType) {
      where.cardType = { equals: cardType as 'QR' };
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    if (guestId) {
      where.guestId = guestId;
    }

    if (restaurantId) {
      where.guest = {
        restaurantId: restaurantId,
      };
    }

    // Get cards with related data
    const [cards, total] = await Promise.all([
      prisma.card.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          cardType: true,
          cardData: true,
          validFrom: true,
          validTo: true,
          isActive: true,
          usageCount: true,
          maxUsage: true,
          createdAt: true,
          guest: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImagePath: true,
              thumbnailImagePath: true,
              company: true,
              restaurant: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          mealTime: {
            select: {
              id: true,
              name: true,
              startTime: true,
              endTime: true,
            },
          },
          _count: {
            select: {
              scanLogs: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.card.count({ where }),
    ]);

    return NextResponse.json({
      cards,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching cards:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/cards - Create new card
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Check permissions
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true },
    });

    if (!user || !(await hasPermission(user.id, PERMISSIONS.CARD_CREATE))) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createCardSchema.parse(body);

    // Check if guest exists
    const guest = await prisma.guest.findUnique({
      where: { id: validatedData.guestId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
        jobTitle: true,
        nationality: true,
        roomNumber: true,
        restaurantId: true,
        isActive: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    if (!guest.isActive) {
      return NextResponse.json(
        { error: "Guest is not active" },
        { status: 400 }
      );
    }

    // Check if meal time exists
    const mealTime = await prisma.mealTime.findUnique({
      where: {
        id: validatedData.mealTimeId,
      },
      select: {
        id: true,
        name: true,
        startTime: true,
        endTime: true,
        isActive: true,
      },
    });

    if (!mealTime || !mealTime.isActive) {
      return NextResponse.json(
        { error: "Meal time not found or inactive" },
        { status: 400 }
      );
    }

    // Generate card number
    const cardNumber = generateCardNumber(
      validatedData.cardType as "QR" | "RFID"
    );

    // Generate enhanced card data with all guest information
    const cardData = createCardDataString({
      id: "", // Will be updated after card creation
      guestId: validatedData.guestId,
      cardNumber: cardNumber,
      cardType: validatedData.cardType,
      expiryDate: validatedData.validTo,
      mealTimeIds: [validatedData.mealTimeId],

      // Guest information
      guestName: `${guest.firstName} ${guest.lastName}`,
      jobTitle: guest.jobTitle || "",
      company: guest.company || "",
      nationality: guest.nationality || "",
      roomNumber: guest.roomNumber || "",

      // Restaurant information
      restaurantName: guest.restaurant.name,
      restaurantLocation: guest.restaurant.location || "",

      // Meal times information
      allowedMealTimes: [
        {
          id: mealTime.id,
          name: mealTime.name,
          startTime: mealTime.startTime,
          endTime: mealTime.endTime,
        },
      ],

      // Card validity
      validFrom: validatedData.validFrom,
      maxUsage: validatedData.maxUsage || 1,
      usageCount: 0,
    });

    // Create card
    const card = await prisma.card.create({
      data: {
        cardData,
        cardType: validatedData.cardType,
        validFrom: new Date(validatedData.validFrom),
        validTo: new Date(validatedData.validTo),
        isActive: validatedData.isActive,
        maxUsage: validatedData.maxUsage || 1,
        guestId: validatedData.guestId,
        mealTimeId: validatedData.mealTimeId,
        createdBy: payload.userId,
      },
      select: {
        id: true,
        cardData: true,
        cardType: true,
        validFrom: true,
        validTo: true,
        isActive: true,
        maxUsage: true,
        usageCount: true,
        createdAt: true,
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
          },
        },
        mealTime: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error("Error creating card:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
