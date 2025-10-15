import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create permissions
  const permissions = [
    // User management
    { name: 'users.create', description: 'Create users', module: 'users', action: 'create' },
    { name: 'users.read', description: 'View users', module: 'users', action: 'read' },
    { name: 'users.update', description: 'Update users', module: 'users', action: 'update' },
    { name: 'users.delete', description: 'Delete users', module: 'users', action: 'delete' },
    
    // Guest management
    { name: 'guests.create', description: 'Create guests', module: 'guests', action: 'create' },
    { name: 'guests.read', description: 'View guests', module: 'guests', action: 'read' },
    { name: 'guests.update', description: 'Update guests', module: 'guests', action: 'update' },
    { name: 'guests.delete', description: 'Delete guests', module: 'guests', action: 'delete' },
    
    // Restaurant management
    { name: 'restaurants.create', description: 'Create restaurants', module: 'restaurants', action: 'create' },
    { name: 'restaurants.read', description: 'View restaurants', module: 'restaurants', action: 'read' },
    { name: 'restaurants.update', description: 'Update restaurants', module: 'restaurants', action: 'update' },
    { name: 'restaurants.delete', description: 'Delete restaurants', module: 'restaurants', action: 'delete' },
    
    // Card management
    { name: 'cards.create', description: 'Create cards', module: 'cards', action: 'create' },
    { name: 'cards.read', description: 'View cards', module: 'cards', action: 'read' },
    { name: 'cards.update', description: 'Update cards', module: 'cards', action: 'update' },
    { name: 'cards.delete', description: 'Delete cards', module: 'cards', action: 'delete' },
    { name: 'cards.print', description: 'Print cards', module: 'cards', action: 'print' },
    
    // Gate management
    { name: 'gates.create', description: 'Create gates', module: 'gates', action: 'create' },
    { name: 'gates.read', description: 'View gates', module: 'gates', action: 'read' },
    { name: 'gates.update', description: 'Update gates', module: 'gates', action: 'update' },
    { name: 'gates.delete', description: 'Delete gates', module: 'gates', action: 'delete' },
    { name: 'gates.control', description: 'Control gates', module: 'gates', action: 'control' },
    
    // Scanning
    { name: 'scan.camera', description: 'Scan with camera', module: 'scan', action: 'camera' },
    { name: 'scan.qr', description: 'Scan QR codes', module: 'scan', action: 'qr' },
    { name: 'scan.rfid', description: 'Scan RFID cards', module: 'scan', action: 'rfid' },
    { name: 'scan.logs', description: 'View scan logs', module: 'scan', action: 'logs' },

    // Dashboard
    { name: 'dashboard.view', description: 'View dashboard', module: 'dashboard', action: 'view' },
    { name: 'dashboard.analytics', description: 'View analytics', module: 'dashboard', action: 'analytics' },

    // Monitoring
    { name: 'monitoring.view', description: 'View monitoring data', module: 'monitoring', action: 'view' },
    { name: 'monitoring.errors', description: 'View error logs', module: 'monitoring', action: 'errors' },

    // Accommodation management
    { name: 'accommodation.create', description: 'Create accommodation records', module: 'accommodation', action: 'create' },
    { name: 'accommodation.read', description: 'View accommodation data', module: 'accommodation', action: 'read' },
    { name: 'accommodation.update', description: 'Update accommodation records', module: 'accommodation', action: 'update' },
    { name: 'accommodation.delete', description: 'Delete accommodation records', module: 'accommodation', action: 'delete' },
  ];

  console.log('📋 Creating permissions...');
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });
  }

  // Create gate types
  console.log('🚪 Creating gate types...');
  const gateTypes = [
    { name: 'MAIN' },
    { name: 'RESTAURANT' },
    { name: 'EMERGENCY' },
    { name: 'SERVICE' },
  ];

  for (const gateType of gateTypes) {
    await prisma.gateType.upsert({
      where: { name: gateType.name },
      update: {},
      create: gateType,
    });
  }

  // Create gate protocols
  console.log('🔌 Creating gate protocols...');
  const gateProtocols = [
    { name: 'TCP_IP' },
    { name: 'RS485' },
    { name: 'HTTP' },
  ];

  for (const gateProtocol of gateProtocols) {
    await prisma.gateProtocol.upsert({
      where: { name: gateProtocol.name },
      update: {},
      create: gateProtocol,
    });
  }

  // Restaurant types are now stored as strings
  console.log('🏷️ Restaurant types will be stored as strings...');

  // Create restaurants
  console.log('🍽️ Creating restaurants...');
  const mainRestaurant = await prisma.restaurant.upsert({
    where: { id: 'restaurant-main' },
    update: {},
    create: {
      id: 'restaurant-main',
      name: 'Main Restaurant',
      nameAr: 'المطعم الرئيسي',
      description: 'Main dining hall for all guests',
      location: 'Ground Floor',
      capacity: 100,
      restaurantType: 'Main Dining',
    },
  });

  const vipRestaurant = await prisma.restaurant.upsert({
    where: { id: 'restaurant-vip' },
    update: {},
    create: {
      id: 'restaurant-vip',
      name: 'VIP Restaurant',
      nameAr: 'مطعم كبار الشخصيات',
      description: 'Exclusive dining area for VIP guests',
      location: 'Second Floor',
      capacity: 50,
      restaurantType: 'VIP Dining',
    },
  });

  // Create meal times
  console.log('⏰ Creating meal times...');
  const mealTimes = [
    {
      restaurantId: mainRestaurant.id,
      name: 'Breakfast',
      nameAr: 'الإفطار',
      startTime: '06:00',
      endTime: '10:00',
    },
    {
      restaurantId: mainRestaurant.id,
      name: 'Lunch',
      nameAr: 'الغداء',
      startTime: '12:00',
      endTime: '15:00',
    },
    {
      restaurantId: mainRestaurant.id,
      name: 'Dinner',
      nameAr: 'العشاء',
      startTime: '18:00',
      endTime: '22:00',
    },
    {
      restaurantId: vipRestaurant.id,
      name: 'VIP Breakfast',
      nameAr: 'إفطار كبار الشخصيات',
      startTime: '07:00',
      endTime: '11:00',
    },
    {
      restaurantId: vipRestaurant.id,
      name: 'VIP Lunch',
      nameAr: 'غداء كبار الشخصيات',
      startTime: '13:00',
      endTime: '16:00',
    },
    {
      restaurantId: vipRestaurant.id,
      name: 'VIP Dinner',
      nameAr: 'عشاء كبار الشخصيات',
      startTime: '19:00',
      endTime: '23:00',
    },
  ];

  for (const mealTime of mealTimes) {
    await prisma.mealTime.upsert({
      where: {
        id: `${mealTime.restaurantId}-${mealTime.name.toLowerCase().replace(/\s+/g, '-')}`,
      },
      update: {},
      create: {
        id: `${mealTime.restaurantId}-${mealTime.name.toLowerCase().replace(/\s+/g, '-')}`,
        ...mealTime,
      },
    });
  }

  // Create admin user
  console.log('👤 Creating admin user...');
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      id: 'user-admin',
      username: 'admin',
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  // Create manager user
  const managerUser = await prisma.user.upsert({
    where: { username: 'manager' },
    update: {
      password: await bcrypt.hash('manager123', 12),
      role: UserRole.MANAGER,
      isActive: true,
    },
    create: {
      id: 'user-manager',
      username: 'manager',
      password: await bcrypt.hash('manager123', 12),
      role: UserRole.MANAGER,
      isActive: true,
    },
  });

  // Create regular user
  const regularUser = await prisma.user.upsert({
    where: { username: 'user' },
    update: {
      password: await bcrypt.hash('user123', 12),
      role: UserRole.USER,
      isActive: true,
    },
    create: {
      id: 'user-regular',
      username: 'user',
      password: await bcrypt.hash('user123', 12),
      role: UserRole.USER,
      isActive: true,
    },
  });

  // Assign permissions to admin (all permissions)
  console.log('🔐 Assigning permissions...');
  const allPermissions = await prisma.permission.findMany();
  
  for (const permission of allPermissions) {
    const existingPermission = await prisma.userPermission.findFirst({
      where: {
        userId: adminUser.id,
        permissionId: permission.id,
      
      },
    });
    
    if (!existingPermission) {
      await prisma.userPermission.create({
        data: {
          userId: adminUser.id,
          permissionId: permission.id,
        },
      });
    }
  }

  // Assign limited permissions to manager
  const managerPermissions = allPermissions.filter((p: any) => 
    !p.name.includes('users.delete') && 
    !p.name.includes('gates.delete') &&
    !p.name.includes('restaurants.delete')
  );
  
  for (const permission of managerPermissions) {
    const existingPermission = await prisma.userPermission.findFirst({
      where: {
        userId: managerUser.id,
        permissionId: permission.id,
  
      },
    });
    
    if (!existingPermission) {
      await prisma.userPermission.create({
        data: {
          userId: managerUser.id,
          permissionId: permission.id,
        },
      });
    }
  }

  // Assign basic permissions to regular user
  const userPermissions = allPermissions.filter((p: any) => 
    p.name.includes('guests.read') ||
    p.name.includes('cards.read') ||
    p.name.includes('scan.') ||
    p.name.includes('dashboard.view')
  );
  
  for (const permission of userPermissions) {
    const existingPermission = await prisma.userPermission.findFirst({
      where: {
        userId: regularUser.id,
        permissionId: permission.id,
     
      },
    });
    
    if (!existingPermission) {
      await prisma.userPermission.create({
        data: {
          userId: regularUser.id,
          permissionId: permission.id,
        },
      });
    }
  }

  // Create gates
  console.log('🚪 Creating gates...');
  const mainGateType = await prisma.gateType.findFirst({ where: { name: 'MAIN' } });
  const restaurantGateType = await prisma.gateType.findFirst({ where: { name: 'RESTAURANT' } });
  const tcpProtocol = await prisma.gateProtocol.findFirst({ where: { name: 'TCP_IP' } });

  void await prisma.gate.upsert({
    where: { id: 'gate-main' },
    update: {},
    create: {
      id: 'gate-main',
      name: 'Main Entrance Gate',
      nameAr: 'البوابة الرئيسية',
      typeId: mainGateType!.id,
      location: 'Main Entrance',
      defaultProtocolId: tcpProtocol!.id,
      ipAddress: '192.168.1.100',
      port: 8080,
      maxCapacity: 50,
      isActive: true,
      status: 'CLOSED',
      description: 'Main entrance gate for all visitors',
      createdById: adminUser.id,
    },
  });

  const restaurantGate = await prisma.gate.upsert({
    where: { id: 'gate-restaurant' },
    update: {},
    create: {
      id: 'gate-restaurant',
      name: 'Restaurant Gate',
      nameAr: 'بوابة المطعم',
      typeId: restaurantGateType!.id,
      location: 'Restaurant Area',
      defaultProtocolId: tcpProtocol!.id,
      ipAddress: '192.168.1.101',
      port: 8081,
      maxCapacity: 30,
      isActive: true,
      status: 'CLOSED',
      description: 'Gate for restaurant access control',
      createdById: adminUser.id,
    },
  });

  // Link restaurants to gates
  await prisma.restaurant.update({
    where: { id: mainRestaurant.id },
    data: { gateId: restaurantGate.id },
  });

  await prisma.restaurant.update({
    where: { id: vipRestaurant.id },
    data: { gateId: restaurantGate.id },
  });

  // Create sample guests
  console.log('👥 Creating sample guests...');
  const sampleGuests = [
    {
      id: 'guest-john-doe',
      firstName: 'John',
      lastName: 'Doe',
      nationalId: '1234567890',
      nationality: 'American',
      company: 'Tech Corp',
      jobTitle: 'Software Engineer',
      checkInDate: new Date('2024-01-15'),
      checkOutDate: new Date('2024-01-20'),
      roomNumber: '101',
      restaurantId: mainRestaurant.id,
      createdBy: adminUser.id,
    },
    {
      id: 'guest-jane-smith',
      firstName: 'Jane',
      lastName: 'Smith',
      passportNo: 'P123456789',
      nationality: 'British',
      company: 'Global Industries',
      jobTitle: 'Project Manager',
      checkInDate: new Date('2024-01-16'),
      checkOutDate: new Date('2024-01-22'),
      roomNumber: '201',
      restaurantId: vipRestaurant.id,
      createdBy: adminUser.id,
    },
  ];

  for (const guest of sampleGuests) {
    await prisma.guest.upsert({
      where: { id: guest.id },
      update: {},
      create: guest,
    });
  }

  console.log('✅ Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- ${permissions.length} permissions created`);
  console.log(`- 2 gates created`);
  console.log(`- 2 restaurants created`);
  console.log(`- 6 meal times created`);
  console.log(`- 3 users created (admin, manager, user)`);
  console.log(`- ${sampleGuests.length} sample guests created`);
  console.log('\n🔑 Default login credentials:');
  console.log('- Admin: username=admin, password=admin123');
  console.log('- Manager: username=manager, password=manager123');
  console.log('- User: username=user, password=user123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });