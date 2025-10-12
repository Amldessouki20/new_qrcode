import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/jwt';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { createCardDataString } from '@/lib/qr-generator';
import { uploadImage } from '@/lib/cloudinary';
import { validateImageFile } from '@/lib/image-utils-server';
import { z } from 'zod';

// export const dynamic = 'force-dynamic';


// Guest validation schema
const createGuestSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
  nationalId: z.string().max(50, 'National ID too long').optional(),
  passportNo: z.string().max(50, 'Passport number too long').optional(),
  nationality: z.string().max(50, 'Nationality too long').optional(),
  company: z.string().max(100, 'Company name too long').optional(),
  religion: z.string().max(100, 'Religion too long').optional(),
  jobTitle: z.string().max(100, 'Job title too long').optional(),
  checkInDate: z.string().datetime().optional(),
  expiredDate: z.string().datetime().optional(),
  roomNumber: z.string().max(20, 'Room number too long').optional(),
  isActive: z.boolean().default(true),
  restaurantId: z.string().min(1, 'Restaurant ID is required'),
  // Card information
  maxMeals: z.number().min(1).max(10).default(3),
  selectedMealTimes: z.array(z.string()).optional(),
  // Profile image fields
  profileImage: z.string().optional(), // Base64 image data
}).refine((data) => {
  if (data.checkInDate && data.expiredDate) {
    return new Date(data.checkInDate) < new Date(data.expiredDate);
  }
  return true;
}, {
  message: 'Expired date must be after check-in date',
  path: ['expiredDate'],
});

// GET /api/guests - List guests with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('accessToken')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check permissions
    const canViewGuests = await hasPermission(payload.userId, PERMISSIONS.GUEST_READ);
    if (!canViewGuests) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const search = searchParams.get('search') || '';
    const restaurantId = searchParams.get('restaurantId') || '';
    const isActive = searchParams.get('isActive');
    const nationality = searchParams.get('nationality') || '';
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Build where clause
    const where: {
      OR?: Array<{
        firstName?: { contains: string; mode?: 'insensitive' };
        lastName?: { contains: string; mode?: 'insensitive' };
        email?: { contains: string; mode?: 'insensitive' };
        phone?: { contains: string; mode?: 'insensitive' };
        nationalId?: { contains: string; mode?: 'insensitive' };
        passportNo?: { contains: string; mode?: 'insensitive' };
        company?: { contains: string; mode?: 'insensitive' };
        religion?: { contains: string; mode?: 'insensitive' };
      }>;
      nationality?: { contains: string; mode: 'insensitive' } | string;
      restaurantId?: string;
      isActive?: boolean;
    } = {};
    if (search) {
      where.OR = [
        {
          firstName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          lastName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          nationalId: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          passportNo: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          company: {
            contains: search,
            mode: 'insensitive',
          },
          religion: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }
    if (restaurantId) {
      where.restaurantId = restaurantId;
    }
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    if (nationality) {
      where.nationality = {
        contains: nationality,
        mode: 'insensitive',
      };
    }

    // Build order by clause
    const orderBy: {
      firstName?: 'asc' | 'desc';
      lastName?: 'asc' | 'desc';
      nationality?: 'asc' | 'desc';
      company?: 'asc' | 'desc';
      religion?: 'asc' | 'desc';
      createdAt?: 'asc' | 'desc';
    } = {};
    if (['firstName', 'lastName', 'nationality', 'company', 'createdAt'].includes(sortBy)) {
      orderBy[sortBy as keyof typeof orderBy] = sortOrder === 'desc' ? 'desc' : 'asc';
    } else {
      orderBy.firstName = 'asc';
    }

    // Get total count
    const total = await prisma.guest.count({ where });

    // Get guests
    const guests = await prisma.guest.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        nationalId: true,
        passportNo: true,
        nationality: true,
        company: true,
        religion: true,
        jobTitle: true,
        checkInDate: true,
        expiredDate: true,
        roomNumber: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
        cards: {
          select: {
            id: true,
            cardData: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            cards: true,
          },
        },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get nationalities for filtering
    const nationalities = await prisma.guest.findMany({
      select: {
        nationality: true,
      },
      where: {
        nationality: {
          not: null,
        },
      },
      distinct: ['nationality'],
      orderBy: {
        nationality: 'asc',
      },
    });

    return NextResponse.json({
      guests,
      nationalities: nationalities.map((n: { nationality: string | null }) => n.nationality).filter(Boolean),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching guests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/guests - Create new guest
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('accessToken')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check permissions
    const canCreateGuests = await hasPermission(payload.userId, PERMISSIONS.GUEST_CREATE);
    if (!canCreateGuests) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createGuestSchema.parse(body);

    // Validate profile image if provided
    let imageUploadResult = null;
    if (validatedData.profileImage) {
      try {
        // Support both data URLs ("data:mime;base64,....") and raw base64 strings
        const profileImage = validatedData.profileImage;
        let base64Data: string;
        let mimeType: string;

        if (profileImage.includes(',')) {
          const [header, data] = profileImage.split(',');
          base64Data = data;
          const match = header.match(/^data:(.*?);base64$/);
          mimeType = match ? match[1] : 'image/jpeg';
        } else {
          // Raw base64 payload without MIME prefix; default to JPEG
          base64Data = profileImage;
          mimeType = 'image/jpeg';
        }

        const buffer = Buffer.from(base64Data, 'base64');
        
        // Create a file-like object for validation
        // const imageFile = {
        //   size: buffer.length,
        //   type: mimeType,
        //   name: `profile-${Date.now()}.${mimeType.split('/')[1]}`
        // };

        // Validate image using the actual image Buffer on server
        const validation = await validateImageFile(buffer);
        if (!validation.isValid) {
          return NextResponse.json(
            { error: validation.error },
            { status: 400 }
          );
        }

        // Upload to Cloudinary
        imageUploadResult = await uploadImage(profileImage.includes(',') ? profileImage : `data:${mimeType};base64,${base64Data}`, {
          folder: 'guest-profiles',
          transformation: [
            { width: 300, height: 300, crop: 'fill', gravity: 'face' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
          ]
        });
      } catch (error) {
        console.error('Error processing profile image:', error);
        return NextResponse.json(
          { error: 'Failed to process profile image' },
          { status: 400 }
        );
      }
    }

    // Check if restaurant exists - optimized query
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: validatedData.restaurantId },
      select: {
        id: true,
        name: true,
        location: true,
        isActive: true,
        mealTimes: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Check if national ID already exists (if provided)
    if (validatedData.nationalId) {
      const existingNationalId = await prisma.guest.findFirst({
        where: {
          nationalId: validatedData.nationalId,
        },
      });

      if (existingNationalId) {
        return NextResponse.json(
          { error: 'Guest with this national ID already exists' },
          { status: 409 }
        );
      }
    }

    // Check if passport number already exists (if provided)
    if (validatedData.passportNo) {
      const existingPassport = await prisma.guest.findFirst({
        where: {
          passportNo: validatedData.passportNo,
        },
      });

      if (existingPassport) {
        return NextResponse.json(
          { error: 'Guest with this passport number already exists' },
          { status: 409 }
        );
      }
    }

    // Generate unique card number
    const generateCardNumber = () => {
      const timestamp = Date.now().toString();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      return `CARD-${timestamp}-${random}`;
    };

    // Create guest and card in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create guest
      const guestData = {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        isActive: validatedData.isActive,
        nationalId: validatedData.nationalId || null,
        passportNo: validatedData.passportNo || null,
        nationality: validatedData.nationality || null,
        company: validatedData.company || null,
        religion: validatedData.religion || null,
        jobTitle: validatedData.jobTitle || null,
        roomNumber: validatedData.roomNumber || null,
        checkInDate: validatedData.checkInDate ? new Date(validatedData.checkInDate) : null,
        expiredDate: validatedData.expiredDate ? new Date(validatedData.expiredDate) : null,
        // Profile image fields
        profileImagePath: imageUploadResult?.secure_url || null,
        thumbnailImagePath: imageUploadResult?.eager?.[0]?.secure_url || null,
        imageUploadedAt: imageUploadResult ? new Date() : null,
        imageSize: imageUploadResult?.bytes || null,
        imageMimeType: imageUploadResult?.format ? `image/${imageUploadResult.format}` : null,
        restaurant: {
          connect: { id: validatedData.restaurantId }
        },
        creator: {
          connect: { id: payload.userId }
        }
      };

      const guest = await tx.guest.create({
        data: guestData,
      });

      // Create card for the guest
      const cardNumber = generateCardNumber();
      const validFrom = validatedData.checkInDate ? new Date(validatedData.checkInDate) : new Date();
      const validTo = validatedData.expiredDate ? new Date(validatedData.expiredDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      // Prepare enhanced card data with full guest information for QR code
      const cardDataForQR = {
        id: guest.id,
        guestId: guest.id,
        cardNumber: cardNumber,
        cardType: 'QR',
        expiryDate: validTo.toISOString(),
        mealTimeIds: validatedData.selectedMealTimes || [],
        
        // Guest information
        guestName: `${validatedData.firstName} ${validatedData.lastName}`,
        jobTitle: validatedData.jobTitle || '',
        company: validatedData.company || '',
        religion: validatedData.religion || '',
        nationality: validatedData.nationality || '',
        roomNumber: validatedData.roomNumber || '',
        
        // Restaurant information
        restaurantName: restaurant.name,
        restaurantLocation: restaurant.location || '',
        
        // Meal times information - only include selected meal times
        allowedMealTimes: validatedData.selectedMealTimes && validatedData.selectedMealTimes.length > 0
          ? restaurant.mealTimes
              .filter(mt => validatedData.selectedMealTimes!.includes(mt.id))
              .map(mt => ({
                id: mt.id,
                name: mt.name,
                startTime: mt.startTime,
                endTime: mt.endTime
              }))
          : restaurant.mealTimes.slice(0, 1).map(mt => ({
              id: mt.id,
              name: mt.name,
              startTime: mt.startTime,
              endTime: mt.endTime
            })), // Default to first meal time if none selected
        
        // Card validity
        validFrom: validFrom.toISOString(),
        maxUsage: validatedData.maxMeals || 3,
        usageCount: 0,
      };

      // Create enhanced QR data string with full guest information
      const qrDataString = createCardDataString(cardDataForQR);


      // Get the first meal time ID (required for card creation)
      const mealTimeId = validatedData.selectedMealTimes && validatedData.selectedMealTimes.length > 0 
        ? validatedData.selectedMealTimes[0] 
        : restaurant.mealTimes[0]?.id;

      if (!mealTimeId) {
        throw new Error('No meal time available for this restaurant');
      }

      await tx.card.create({
        data: {
          cardType: 'QR',
          cardData: qrDataString, // Use compact QR data string
          validFrom,
          validTo,
          maxUsage: validatedData.maxMeals * Math.ceil((validTo.getTime() - validFrom.getTime()) / (24 * 60 * 60 * 1000)), // maxMeals per day
          usageCount: 0,
          isActive: true,
          guestId: guest.id,
          mealTimeId: mealTimeId,
          createdBy: payload.userId,
        },
      });

      // Return guest with card information
      return await tx.guest.findUnique({
        where: { id: guest.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          nationalId: true,
          passportNo: true,
          nationality: true,
          company: true,
          religion: true,
          jobTitle: true,
          checkInDate: true,
          expiredDate: true,
          roomNumber: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          // Profile image fields
          profileImagePath: true,
          thumbnailImagePath: true,
          imageUploadedAt: true,
          imageSize: true,
          imageMimeType: true,
          restaurant: {
            select: {
              id: true,
              name: true,
            },
          },
          creator: {
            select: {
              id: true,
              username: true,
            },
          },
          cards: {
            select: {
              id: true,
              cardType: true,
              cardData: true,
              validFrom: true,
              validTo: true,
              maxUsage: true,
               usageCount: true,
              isActive: true,
            },
          },
        },
      });
    });

    const guest = result;

    return NextResponse.json(
      {
        message: 'Guest and card created successfully',
        guest,
        card: guest?.cards?.[0],
        printUrl: `/api/cards/${guest?.cards?.[0]?.id}/print`,
        qrUrl: `/api/cards/${guest?.cards?.[0]?.id}/qr`,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error' },
        { status: 400 }
      );
    }

    console.error('Error creating guest:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}