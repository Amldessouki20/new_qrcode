import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/jwt';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { z } from 'zod';




interface GateWithProtocol {
  id: string;
  name: string;
  nameAr: string;
  ipAddress: string | null;
  port: number | null;
  serialPort: string | null;
  baudRate: number | null;
  status?: string;
  defaultProtocol: {
    name: string;
  } | null;
}

const gateControlSchema = z.object({
  action: z.enum(['OPEN', 'CLOSE', 'STATUS', 'RESET', 'EMERGENCY_OPEN']),
  duration: z.number().min(1).max(60).optional(), // Duration in seconds for OPEN action
  reason: z.string().optional()
});

// POST /api/gates/[id]/control - Control gate operations
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('accessToken')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'رمز غير صحيح' }, { status: 401 });
    }

    if (!(await hasPermission(payload.userId, PERMISSIONS.GATE_CONTROL))) {
      return NextResponse.json({ error: 'ليس لديك صلاحية للتحكم في البوابات' }, { status: 403 });
    }

    const gate = await prisma.gate.findUnique({
      where: { id },
      include: {
        defaultProtocol: true
      }
    });

    if (!gate) {
      return NextResponse.json({ error: 'البوابة غير موجودة' }, { status: 404 });
    }

    if (!gate.isActive) {
      return NextResponse.json({ error: 'البوابة غير نشطة' }, { status: 400 });
    }

    const body = await request.json();
    const { action, duration = 5 } = gateControlSchema.parse(body);

    // Create control log
    const controlLog = await prisma.gateControlLog.create({
      data: {
        gateId: id,
        userId: payload.userId,
        action,
        duration: action === 'OPEN' ? duration : null,
        isSuccess: false // Will be updated after control attempt
      }
    });

    // Simulate gate control based on protocol
    let result: {
      success: boolean;
      message: string;
      data?: Record<string, unknown>;
    };
    try {
      switch (gate.defaultProtocol?.name) {
        case 'TCP_IP':
          result = await controlGateViaTCP(gate, action, duration);
          break;
        case 'RS485':
          result = await controlGateViaRS485(gate, action, duration);
          break;
        case 'HTTP':
          result = await controlGateViaHTTP(gate, action);
          break;
        default:
          throw new Error('بروتوكول غير مدعوم');
      }

      // Update gate status if successful
      if (result.success) {
        await prisma.gate.update({
          where: { id },
          data: {
            lastControlAt: new Date(),
            status: action === 'OPEN' ? 'OPEN' : action === 'CLOSE' ? 'CLOSED' : gate.status
          }
        });

        // Update control log
        await prisma.gateControlLog.update({
          where: {
            id: controlLog.id
          },
          data: {
            isSuccess: true,
            errorMessage: result.message
          }
        });
      }

      return NextResponse.json({
        success: result.success,
        message: result.message,
        data: result.data
      });

    } catch (controlError) {
      // Update control log with error
      await prisma.gateControlLog.update({
        where: {
          id: controlLog.id
        },
        data: {
          isSuccess: false,
          errorMessage: controlError instanceof Error ? controlError.message : 'خطأ غير معروف'
        }
      });

      throw controlError;
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'بيانات غير صحيحة',
        details: error.issues 
      }, { status: 400 });
    }

    console.error('Error controlling gate:', error);
    return NextResponse.json({ 
      error: 'فشل في التحكم بالبوابة',
      details: error instanceof Error ? error.message : 'خطأ غير معروف'
    }, { status: 500 });
  }
}

// TCP/IP Gate Control
async function controlGateViaTCP(gate: GateWithProtocol, action: string, duration: number) {
  // Simulate TCP/IP communication with ST-ST01 gate
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  try {
    // Simulate network delay
    await delay(100);

    if (!gate.ipAddress) {
      throw new Error('عنوان IP غير محدد للبوابة');
    }

    // Simulate different responses based on action
    switch (action) {
      case 'OPEN':
        return {
          success: true,
          message: `تم فتح البوابة لمدة ${duration} ثانية`,
          data: { 
            status: 'OPEN',
            duration,
            timestamp: new Date().toISOString()
          }
        };

      case 'CLOSE':
        return {
          success: true,
          message: 'تم إغلاق البوابة',
          data: { 
            status: 'CLOSED',
            timestamp: new Date().toISOString()
          }
        };

      case 'STATUS':
        return {
          success: true,
          message: 'حالة البوابة: نشطة',
          data: { 
            status: gate.status || 'CLOSED',
            online: true,
            lastSeen: new Date().toISOString(),
            passageCount: Math.floor(Math.random() * 100)
          }
        };

      case 'RESET':
        return {
          success: true,
          message: 'تم إعادة تعيين البوابة',
          data: { 
            status: 'RESET',
            timestamp: new Date().toISOString()
          }
        };

      case 'EMERGENCY_OPEN':
        return {
          success: true,
          message: 'تم فتح البوابة في وضع الطوارئ',
          data: { 
            status: 'EMERGENCY_OPEN',
            timestamp: new Date().toISOString()
          }
        };

      default:
        throw new Error('إجراء غير مدعوم');
    }
  } catch (error) {
    throw new Error(`خطأ في اتصال TCP/IP: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
  }
}

// RS485 Gate Control
async function controlGateViaRS485(gate: GateWithProtocol, action: string, duration: number) {
  // Simulate RS485 communication
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  try {
    await delay(200); // RS485 is typically slower

    if (!gate.serialPort) {
      throw new Error('منفذ تسلسلي غير محدد للبوابة');
    }

    // Simulate RS485 command responses
    const responses = {
      OPEN: { success: true, message: `فتح البوابة عبر RS485 لمدة ${duration} ثانية` },
      CLOSE: { success: true, message: 'إغلاق البوابة عبر RS485' },
      STATUS: { success: true, message: 'حالة البوابة عبر RS485: متصلة' },
      RESET: { success: true, message: 'إعادة تعيين البوابة عبر RS485' },
      EMERGENCY_OPEN: { success: true, message: 'فتح طوارئ عبر RS485' }
    };

    return responses[action as keyof typeof responses] || { success: false, message: 'إجراء غير مدعوم' };

  } catch (error) {
    throw new Error(`خطأ في اتصال RS485: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
  }
}

// HTTP Gate Control
async function controlGateViaHTTP(gate: GateWithProtocol, action: string) {
  // Simulate HTTP API communication
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  try {
    await delay(150);

    if (!gate.ipAddress) {
      throw new Error('عنوان IP غير محدد للبوابة');
    }

    // Simulate HTTP API responses
    return {
      success: true,
      message: `تم تنفيذ ${action} عبر HTTP API`,
      data: {
        endpoint: `http://${gate.ipAddress}:${gate.port || 80}/api/gate/${action.toLowerCase()}`,
        response: 'OK',
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    throw new Error(`خطأ في اتصال HTTP: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
  }
}
