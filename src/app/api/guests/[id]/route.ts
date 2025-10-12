import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { verifyAccessToken } from '@/lib/jwt';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { uploadImage, deleteImage } from '@/lib/cloudinary';
import { validateImageFile } from '@/lib/image-utils-server';
import { z } from 'zod';

// export const dynamic = 'force-dynamic';


// Guest update validation schema
const updateGuestSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  nationalId: z.string().optional(),
  passportNo: z.string().optional(),
  nationality: z.string().optional(),
  company: z.string().optional(),
  religion: z.string().optional(),
  jobTitle: z.string().optional(),
  checkInDate: z.string().optional(),
  expiredDate: z.string().optional(),
  roomNumber: z.string().optional(),
  isActive: z.boolean().optional(),
  restaurantId: z.string().optional(),
  // Profile image fields
  profileImage: z.string().optional(), // Base64 image data
  removeImage: z.boolean().optional(), // Flag to remove existing image
});

// GET /api/guests/[id] - Get guest by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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
    if (!(await hasPermission(payload.userId, PERMISSIONS.GUEST_READ))) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get guest with related data
    const guest = await prisma.guest.findUnique({
      where: { id },
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
        creator: {
          select: {
            id: true,
            username: true,
          },
        },
        cards: {
          select: {
            id: true,
            cardData: true,
            cardType: true,
            isActive: true,
            validFrom: true,
            validTo: true,
            usageCount: true,
            maxUsage: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            cards: true,
          },
        },
      },
    });

    if (!guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    return NextResponse.json({ guest });
  } catch (error) {
    console.error('Error fetching guest:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/guests/[id] - Update guest
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    if (!(await hasPermission(payload.userId, PERMISSIONS.GUEST_UPDATE))) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Check if guest exists
    const existingGuest = await prisma.guest.findUnique({
      where: { id },
    });

    if (!existingGuest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateGuestSchema.parse(body);

    // Handle profile image update
    let imageUploadResult = null;
    let shouldDeleteOldImage = false;

    if (validatedData.removeImage) {
      // User wants to remove the existing image
      shouldDeleteOldImage = true;
    } else if (validatedData.profileImage) {
      // User wants to upload a new image
      try {
        // Convert base64 to file for validation
        const base64Data = validatedData.profileImage.split(',')[1];
        const mimeType = validatedData.profileImage.split(',')[0].split(':')[1].split(';')[0];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Create a file-like object for validation
        const imageFile = {
          size: buffer.length,
          type: mimeType,
          name: `profile-${Date.now()}.${mimeType.split('/')[1]}`
        };

        // Validate image
        const validation = await validateImageFile(imageFile as File);
        if (!validation.isValid) {
          return NextResponse.json(
            { error: validation.error },
            { status: 400 }
          );
        }

        // Upload to Cloudinary
        imageUploadResult = await uploadImage(validatedData.profileImage, {
          folder: 'guest-profiles',
          transformation: [
            { width: 300, height: 300, crop: 'fill', gravity: 'face' },
            { quality: 'auto', format: 'auto' }
          ]
        });

        shouldDeleteOldImage = true; // Delete old image when uploading new one
      } catch (error) {
        console.error('Error processing profile image:', error);
        return NextResponse.json(
          { error: 'Failed to process profile image' },
          { status: 400 }
        );
      }
    }

    // Delete old image from Cloudinary if needed
    if (shouldDeleteOldImage && existingGuest.profileImagePath) {
      try {
        // Extract public_id from Cloudinary URL
        const urlParts = existingGuest.profileImagePath.split('/');
        const publicIdWithExtension = urlParts[urlParts.length - 1];
        const publicId = `guest-profiles/${publicIdWithExtension.split('.')[0]}`;
        await deleteImage(publicId);
      } catch (error) {
        console.error('Error deleting old image:', error);
        // Continue with update even if image deletion fails
      }
    }

    // Check if restaurant exists (if restaurantId is being updated)
    if (validatedData.restaurantId && validatedData.restaurantId !== existingGuest.restaurantId) {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: validatedData.restaurantId },
      });

      if (!restaurant) {
        return NextResponse.json(
          { error: 'Restaurant not found' },
          { status: 404 }
        );
      }
    }

    // Check if national ID already exists (if updating national ID)
    if (validatedData.nationalId && validatedData.nationalId !== existingGuest.nationalId) {
      const existingNationalId = await prisma.guest.findFirst({
        where: {
          nationalId: validatedData.nationalId,
          id: { not: id },
        },
      });

      if (existingNationalId) {
        return NextResponse.json(
          { error: 'Guest with this national ID already exists' },
          { status: 409 }
        );
      }
    }

    // Check if passport number already exists (if updating passport number)
    if (validatedData.passportNo && validatedData.passportNo !== existingGuest.passportNo) {
      const existingPassport = await prisma.guest.findFirst({
        where: {
          passportNo: validatedData.passportNo,
          id: { not: id },
        },
      });

      if (existingPassport) {
        return NextResponse.json(
          { error: 'Guest with this passport number already exists' },
          { status: 409 }
        );
      }
    }

    // Filter out fields that are not part of the guest model
    const { restaurantId, checkInDate, expiredDate, ...guestData } = validatedData;
    
    // Prepare update data - filter out undefined values
    const filteredGuestData = Object.fromEntries(
      Object.entries(guestData).filter(([, value]) => value !== undefined)
    );
    
    const updateData: Prisma.GuestUpdateInput = {
      ...filteredGuestData,
      ...(checkInDate && { checkInDate: new Date(checkInDate) }),
      ...(expiredDate && { expiredDate: new Date(expiredDate) }),
      updater: {
        connect: { id: payload.userId }
      },
    };

    // Handle image updates
    if (imageUploadResult) {
      // New image uploaded
      updateData.profileImagePath = imageUploadResult.secure_url;
      updateData.thumbnailImagePath = imageUploadResult.eager?.[0]?.secure_url || null;
      updateData.imageUploadedAt = new Date();
      updateData.imageSize = imageUploadResult.bytes;
      updateData.imageMimeType = `image/${imageUploadResult.format}`;
    } else if (shouldDeleteOldImage) {
      // Remove image
      updateData.profileImagePath = null;
      updateData.thumbnailImagePath = null;
      updateData.imageUploadedAt = null;
      updateData.imageSize = null;
      updateData.imageMimeType = null;
    }
    
    // Handle restaurant relationship if restaurantId is provided
    if (restaurantId) {
      updateData.restaurant = {
        connect: { id: restaurantId }
      };
    }
    
    // Update guest
    const updatedGuest = await prisma.guest.update({
      where: { id },
      data: updateData,
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
      },
    });

    return NextResponse.json({
      message: 'Guest updated successfully',
      guest: updatedGuest,
    });
  } catch (error) {
      console.error('Error creating guest:', error); 
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error' },
        
        { status: 400 }
      );
    }

    console.error('Error updating guest:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/guests/[id] - Delete guest
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    if (!(await hasPermission(payload.userId, PERMISSIONS.GUEST_DELETE))) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Check if guest exists
    const guest = await prisma.guest.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            cards: true,
          },
        },
      },
    });

    if (!guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    // Check if guest has associated smart cards
    if (guest._count.cards > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete guest with associated smart cards. Please remove them first.',
        },
        { status: 409 }
      );
    }

    // Delete guest
    await prisma.guest.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Guest deleted successfully' });
  } catch (error) {
    console.error('Error deleting guest:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}