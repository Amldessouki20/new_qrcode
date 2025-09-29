import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAccessToken } from '@/lib/jwt';




const prisma = new PrismaClient();

// GET /api/dashboard/stats - Get dashboard statistics
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

    // Get current date for today's statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all statistics in parallel
    const [totalUsers, totalRestaurants, totalGuests, totalCards, activeCards, todayScans] = await Promise.all([
      // Total users count
      prisma.user.count(),
      
      // Total restaurants count
      prisma.restaurant.count(),
      
      // Total guests count
      prisma.guest.count(),
      
      // Total cards count
      prisma.card.count(),
      
      // Active cards count
      prisma.card.count({
        where: {
          isActive: true
        }
      }),
      
      // Today's scans count
      prisma.scanLog.count({
        where: {
          scanTime: {
            gte: today,
            lt: tomorrow
          }
        }
      })
    ]);

    // Get recent activities (last 10) - optimized query
    const recentActivities = await prisma.scanLog.findMany({
      take: 10,
      orderBy: {
        scanTime: 'desc'
      },
      select: {
        id: true,
        scanTime: true,
        isSuccess: true,
        stationId: true,
        card: {
          select: {
            guest: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    // Format recent activities
    const formattedActivities = recentActivities.map(activity => ({
      id: activity.id,
      action: activity.isSuccess ? 'Card scanned successfully' : 'Card scan failed',
      user: activity.card?.guest ? `${activity.card.guest.firstName} ${activity.card.guest.lastName}` : 'Unknown',
      time: getTimeAgo(activity.scanTime),
      type: 'scan',
      location: activity.stationId || 'Unknown Station'
    }));

    // Calculate percentage changes (mock data for now - you can implement actual historical comparison)
    const stats = {
      totalUsers: {
        value: totalUsers,
        change: '+2 from last month',
        percentage: '+8.3%'
      },
      totalRestaurants: {
        value: totalRestaurants,
        change: totalRestaurants > 0 ? '+1 from last month' : 'No restaurants yet',
        percentage: totalRestaurants > 0 ? '+12.5%' : '0%'
      },
      totalGuests: {
        value: totalGuests,
        change: totalGuests > 0 ? `+${Math.floor(totalGuests * 0.1)} from last week` : 'No guests yet',
        percentage: totalGuests > 0 ? '+7.7%' : '0%'
      },
      totalCards: {
        value: totalCards,
        change: totalCards > 0 ? `+${Math.floor(totalCards * 0.05)} from last week` : 'No cards yet',
        percentage: totalCards > 0 ? '+5.6%' : '0%'
      },
      activeCards: {
        value: activeCards,
        change: `${activeCards} active cards`,
        percentage: totalCards > 0 ? `${Math.round((activeCards / totalCards) * 100)}% active` : '0%'
      },
      todayScans: {
        value: todayScans,
        change: 'scans today',
        percentage: todayScans > 0 ? '+15% from yesterday' : '0%'
      }
    };

    return NextResponse.json({
      stats,
      recentActivities: formattedActivities,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}

// Helper function to calculate time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}