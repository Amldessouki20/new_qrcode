import QRCode from 'qrcode';

interface QRCodeOptions {
  size?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

interface CardData {
  id: string;
  guestId: string;
  cardNumber: string;
  cardType: string;
  expiryDate: string;
  mealTimeIds: string[];
  // Guest information
  guestName?: string;
  jobTitle?: string;
  company?: string;
  nationality?: string;
  roomNumber?: string;
  // Restaurant information
  restaurantName?: string;
  restaurantLocation?: string;
  // Meal times information
  allowedMealTimes?: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
  }[];
  // Card validity
  validFrom?: string;
  maxUsage?: number;
  usageCount?: number;
}

/**
 * Generate QR code as PNG buffer
 */
export async function generateQRCodePNG(
  data: string,
  options: QRCodeOptions = {}
): Promise<Buffer> {
  const qrOptions = {
    width: options.size || 300,
    margin: options.margin || 2,
    color: {
      dark: options.color?.dark || '#000000',
      light: options.color?.light || '#FFFFFF',
    },
    errorCorrectionLevel: options.errorCorrectionLevel || 'M',
  };

  try {
    const buffer = await QRCode.toBuffer(data, qrOptions);
    return buffer;
  } catch (error) {
    console.error('Error generating QR code PNG:', error);
    throw new Error('Failed to generate QR code PNG');
  }
}

/**
 * Generate QR code as SVG string
 */
export async function generateQRCodeSVG(
  data: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const qrOptions = {
    width: options.size || 300,
    margin: options.margin || 2,
    color: {
      dark: options.color?.dark || '#000000',
      light: options.color?.light || '#FFFFFF',
    },
    errorCorrectionLevel: options.errorCorrectionLevel || 'M',
  };

  try {
    const svg = await QRCode.toString(data, { type: 'svg', ...qrOptions });
    return svg;
  } catch (error) {
    console.error('Error generating QR code SVG:', error);
    throw new Error('Failed to generate QR code SVG');
  }
}

/**
 * Generate QR code data URL for web display
 */
export async function generateQRCodeDataURL(
  data: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const qrOptions = {
    width: options.size || 300,
    margin: options.margin || 2,
    color: {
      dark: options.color?.dark || '#000000',
      light: options.color?.light || '#FFFFFF',
    },
    errorCorrectionLevel: options.errorCorrectionLevel || 'M',
  };

  try {
    const dataURL = await QRCode.toDataURL(data, qrOptions);
    return dataURL;
  } catch (error) {
    console.error('Error generating QR code data URL:', error);
    throw new Error('Failed to generate QR code data URL');
  }
}

/**
 * Generate high-quality QR code data URL specifically for printing
 */
export async function generatePrintQRCodeDataURL(
  data: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const qrOptions = {
    width: options.size || 1000, // دقة أعلى للطباعة
    margin: options.margin || 8, // هامش أكبر لمسح أفضل
    color: {
      dark: options.color?.dark || '#000000',
      light: options.color?.light || '#FFFFFF',
    },
    errorCorrectionLevel: options.errorCorrectionLevel || 'H', // أعلى مستوى تصحيح أخطاء
  };

  try {
    const dataURL = await QRCode.toDataURL(data, qrOptions);
    return dataURL;
  } catch (error) {
    console.error('Error generating print QR code data URL:', error);
    throw new Error('Failed to generate print QR code data URL');
  }
}

/**
 * Create card data string for QR code (Phone-optimized format)
 */
export function createCardDataString(cardData: CardData): string {
  // استخدام التنسيق المضغوط للمسح الأمثل من الهاتف
  return createUltraCompactCardDataString(cardData);
}

/**
 * Create simple card data string (Card Number Only)
 */
export function createSimpleCardDataString(cardNumber: string): string {
  return cardNumber;
}

/**
 * Create ultra-compact card data string (Optimized for phone camera scanning)
 */
export function createUltraCompactCardDataString(cardData: CardData): string {
  // تنسيق محسن للمسح من كاميرا الهاتف مع معلومات الوجبات الكاملة
  const data = {
    i: cardData.id, // ID كامل
    c: cardData.cardNumber, // رقم البطاقة كامل
    g: cardData.guestName || cardData.guestId || 'GUEST', // اسم الضيف كامل
    e: cardData.expiryDate.split('T')[0], // تاريخ الانتهاء فقط
    m: cardData.mealTimeIds.length, // عدد الوجبات
    r: cardData.restaurantName || 'REST', // اسم المطعم كامل
    t: Math.floor(Date.now() / 1000), // timestamp للتحقق
    // إضافة معلومات الوجبات الكاملة
    mt: cardData.allowedMealTimes?.map(mt => ({
      i: mt.id,
      n: mt.name, // اسم الوجبة كامل
      s: mt.startTime,
      e: mt.endTime
    })) || [],
    // إضافة معلومات الضيف الكاملة
    gn: cardData.guestName || '',
    jt: cardData.jobTitle || '',
    co: cardData.company || '',
    na: cardData.nationality || '',
    rm: cardData.roomNumber || '',
    // إضافة معلومات المطعم الكاملة
    rn: cardData.restaurantName || '',
    rl: cardData.restaurantLocation || '',
    // إضافة معلومات الاستخدام
    mu: cardData.maxUsage || 1,
    uc: cardData.usageCount || 0,
    vf: cardData.validFrom || '',
    vt: cardData.expiryDate || ''
  };
  
  return JSON.stringify(data);
}

/**
 * Parse card data from QR code string (Supports multiple formats)
 */
export function parseCardDataString(dataString: string): CardData | null {
  try {
    // إذا كان النص مجرد رقم بطاقة (تنسيق بسيط)
    if (!dataString.startsWith('{')) {
      return {
        id: '',
        guestId: '',
        cardNumber: dataString,
        cardType: 'QR',
        expiryDate: '',
        mealTimeIds: [],
      };
    }

    const parsed = JSON.parse(dataString);
    
    // التنسيق المحسن الجديد
    if (parsed.i && parsed.g && parsed.c) {
      return {
        id: parsed.i,
        guestId: parsed.g,
        cardNumber: parsed.c,
        cardType: parsed.t || 'QR',
        expiryDate: parsed.vt || parsed.e || '', // Support both new (vt) and old (e) formats
        mealTimeIds: parsed.mt?.map((mt: { i: string }) => mt.i) || [], // Extract meal time IDs
        
        // Guest information
        guestName: parsed.gn || '',
        jobTitle: parsed.jt || '',
        company: parsed.co || '',
        nationality: parsed.na || '',
        roomNumber: parsed.rm || '',
        
        // Restaurant information
        restaurantName: parsed.rn || '',
        restaurantLocation: parsed.rl || '',
        
        // Meal times information
        allowedMealTimes: parsed.mt ? parsed.mt.map((mt: { i: string; n: string; s: string; e: string }) => ({
          id: mt.i,
          name: mt.n,
          startTime: mt.s,
          endTime: mt.e
        })) : [],
        
        // Card validity
        validFrom: parsed.vf || '',
        maxUsage: parsed.mu || 1,
        usageCount: parsed.uc || 0,
      };
    }
    
    // تنسيق قديم (للتوافق مع البطاقات الموجودة)
    if (parsed.id || parsed.guestId || parsed.cardNumber) {
      return {
        id: parsed.id || '',
        guestId: parsed.guestId || '',
        cardNumber: parsed.cardNumber || '',
        cardType: parsed.type || 'QR',
        expiryDate: parsed.expiry || '',
        mealTimeIds: parsed.meals || [],
      };
    }

    return null;
  } catch (error) {
    console.error('Error parsing card data string:', error);
    return null;
  }
}

/**
 * Generate RFID card number
 */
export function generateRFIDCardNumber(): string {
  // Generate a 10-digit RFID card number
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return timestamp + random;
}

/**
 * Generate card number based on type
 */
export function generateCardNumber(cardType: 'QR' | 'RFID' | 'BOTH'): string {
  const prefix = cardType === 'QR' ? 'QR' : cardType === 'RFID' ? 'RF' : 'CB';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `${prefix}${timestamp}${random}`;
}

/**
 * Validate QR code data
 */
export function validateQRCodeData(dataString: string): boolean {
  try {
    const parsed = parseCardDataString(dataString);
    if (!parsed) return false;

    // Check if card is not expired
    const expiryDate = new Date(parsed.expiryDate);
    const now = new Date();
    
    return expiryDate > now;
  } catch {
    return false;
  }
}

/**
 * Create card data for React components
 */
export function createCardDataForComponent(cardData: CardData): CardData {
  return cardData;
}

/**
 * Generate card data for React components
 */
export async function generateCardDataForComponent({
  card,
  guest,
  restaurant,
  mealTimes,
  options = {},
}: {
  card: {
    id: string;
    cardData: string;
    cardType: string;
    validFrom: Date;
    validTo: Date;
    isActive: boolean;
  };
  guest: {
    firstName: string;
    lastName: string;
    company?: string | null;
    jobTitle?: string | null;
  };
  restaurant: {
    name: string;
    location?: string | null;
  };
  
  mealTimes: {
    name: string;
    startTime: string;
    endTime: string;
  }[];
  options?: {
    includeQR?: boolean;
    includeRFID?: boolean;
    cardSize?: 'standard' | 'large' | 'small';
    orientation?: 'portrait' | 'landscape';
  };
}): Promise<{
  card: typeof card;
  guest: typeof guest;
  restaurant: typeof restaurant;
  mealTimes: typeof mealTimes;
  qrCodeDataUrl?: string;
  options: typeof options;
}> {
  const { includeQR = true } = options;

  // Generate QR code if needed
  let qrCodeDataUrl = '';
  if (includeQR) {
    // Use full card data for complete guest information
    qrCodeDataUrl = await generatePrintQRCodeDataURL(card.cardData, {
      size: 500,
      margin: 6,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  }

  return {
    card,
    guest,
    restaurant,
    mealTimes,
    qrCodeDataUrl,
    options
  };
}