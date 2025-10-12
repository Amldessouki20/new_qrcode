import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/jwt';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { uploadImage, deleteImage } from '@/lib/cloudinary';
import { validateImageFile } from '@/lib/image-utils-server';
import { z } from 'zod';

const imageUploadSchema = z.object({
  profileImage: z.string().min(1, 'Profile image is required'), // Base64 image data
});

// GET /api/guests/[id]/image - Get guest image information
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

    // Get guest image information
    const guest = await prisma.guest.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profileImagePath: true,
        thumbnailImagePath: true,
        imageUploadedAt: true,
        imageSize: true,
        imageMimeType: true,
      },
    });

    if (!guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      guest: {
        id: guest.id,
        name: `${guest.firstName} ${guest.lastName}`,
        profileImagePath: guest.profileImagePath,
        thumbnailImagePath: guest.thumbnailImagePath,
        imageUploadedAt: guest.imageUploadedAt,
        imageSize: guest.imageSize,
        imageMimeType: guest.imageMimeType,
        hasImage: !!guest.profileImagePath,
      }
    });
  } catch (error) {
    console.error('Error fetching guest image:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/guests/[id]/image - Upload new profile image
export async function POST(
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
      select: {
        id: true,
        profileImagePath: true,
      },
    });

    if (!existingGuest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = imageUploadSchema.parse(body);

    // Validate and upload image
    let imageUploadResult;
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

    // Delete old image from Cloudinary if exists
    if (existingGuest.profileImagePath) {
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

    // Update guest with new image information
    const updatedGuest = await prisma.guest.update({
      where: { id },
      data: {
        profileImagePath: imageUploadResult.secure_url,
        thumbnailImagePath: imageUploadResult.eager?.[0]?.secure_url || null,
        imageUploadedAt: new Date(),
        imageSize: imageUploadResult.bytes,
        imageMimeType: `image/${imageUploadResult.format}`,
        updater: {
          connect: { id: payload.userId }
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profileImagePath: true,
        thumbnailImagePath: true,
        imageUploadedAt: true,
        imageSize: true,
        imageMimeType: true,
      },
    });

    return NextResponse.json({
      message: 'Profile image uploaded successfully',
      guest: {
        id: updatedGuest.id,
        name: `${updatedGuest.firstName} ${updatedGuest.lastName}`,
        profileImagePath: updatedGuest.profileImagePath,
        thumbnailImagePath: updatedGuest.thumbnailImagePath,
        imageUploadedAt: updatedGuest.imageUploadedAt,
        imageSize: updatedGuest.imageSize,
        imageMimeType: updatedGuest.imageMimeType,
        hasImage: true,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error uploading guest image:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/guests/[id]/image - Delete profile image
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
    if (!(await hasPermission(payload.userId, PERMISSIONS.GUEST_UPDATE))) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Check if guest exists and has an image
    const existingGuest = await prisma.guest.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profileImagePath: true,
      },
    });

    if (!existingGuest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    if (!existingGuest.profileImagePath) {
      return NextResponse.json({ error: 'Guest has no profile image' }, { status: 404 });
    }

    // Delete image from Cloudinary
    try {
      // Extract public_id from Cloudinary URL
      const urlParts = existingGuest.profileImagePath.split('/');
      const publicIdWithExtension = urlParts[urlParts.length - 1];
      const publicId = `guest-profiles/${publicIdWithExtension.split('.')[0]}`;
      await deleteImage(publicId);
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
      // Continue with database update even if Cloudinary deletion fails
    }

    // Update guest to remove image information
    const updatedGuest = await prisma.guest.update({
      where: { id },
      data: {
        profileImagePath: null,
        thumbnailImagePath: null,
        imageUploadedAt: null,
        imageSize: null,
        imageMimeType: null,
        updater: {
          connect: { id: payload.userId }
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    return NextResponse.json({
      message: 'Profile image deleted successfully',
      guest: {
        id: updatedGuest.id,
        name: `${updatedGuest.firstName} ${updatedGuest.lastName}`,
        hasImage: false,
      }
    });
  } catch (error) {
    console.error('Error deleting guest image:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}