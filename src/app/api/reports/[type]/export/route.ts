import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/jwt';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } from 'docx';
import puppeteer from 'puppeteer';

export const dynamic = 'force-dynamic';

interface ReportData {
  id?: string;
  username?: string;
  role?: string;
  isActive?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  name?: string;
  nameAr?: string | null;
  location?: string | null;
  firstName?: string;
  lastName?: string;
  nationalId?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  nationality?: string | null;
  roomNumber?: string | null;
  checkInDate?: Date | string | null;
  expiredDate?: Date | string | null;
  restaurant?: { name?: string };
  guest?: {
    firstName?: string;
    lastName?: string;
    nationalId?: string | null;
    roomNumber?: string | null;
    checkInDate?: Date | string | null;
    expiredDate?: Date | string | null;
    restaurant?: { name?: string };
  } | null;
  card?: {
    id?: string;
    guest?: { 
      firstName?: string; 
      lastName?: string; 
      nationalId?: string | null;
      roomNumber?: string | null;
      checkInDate?: Date | string | null;
      expiredDate?: Date | string | null;
      restaurant?: { name?: string };
    } | null;
  } | null;
  cardType?: string;
  validFrom?: Date | string;
  validTo?: Date | string;
  usageCount?: number;
  maxUsage?: number;
  scanTime?: Date | string;
  isSuccess?: boolean;
  stationId?: string | null;
  errorMessage?: string | null;
  _count?: { guests?: number; mealTimes?: number };
  metric?: string;
  value?: string | number;
  [key: string]: unknown;
}

async function getUser() {
  try {
    const token = (await cookies()).get('token')?.value;
    if (!token) return null;
    return await verifyAccessToken(token);
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'pdf';
    
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await hasPermission(user.userId, PERMISSIONS.USER_LIST))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let data: ReportData[] = [];
    let reportTitle = '';
    let headers: string[] = [];

    switch (type) {
      case 'users':
        data = await prisma.user.findMany({
          select: {
            id: true,
            username: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true
          }
        });
        reportTitle = 'Users Report';
        headers = ['ID', 'Username', 'Role', 'Status', 'Created At', 'Updated At'];
        break;

      case 'restaurants':
        data = await prisma.restaurant.findMany({
          select: {
            id: true,
            name: true,
            nameAr: true,
            location: true,
            isActive: true,
            createdAt: true,
            _count: {
              select: {
                guests: true,
                mealTimes: true
              }
            }
          }
        });
        reportTitle = 'Restaurants Report';
        headers = ['ID', 'Name', 'Name(Arabic)', 'Location', 'Status', 'Guests Count', 'Meal Times', 'Created At'];
        break;

      case 'guests':
        data = await prisma.guest.findMany({
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nationalId: true,
            company: true,
            jobTitle: true,
            nationality: true,
            roomNumber: true,
            checkInDate: true,
            expiredDate: true,
            isActive: true,
            createdAt: true,
            restaurant: {
              select: {
                name: true
              }
            }
          }
        });
        reportTitle = 'Guests Report';
        headers = ['ID', 'First Name', 'Last Name', 'National ID', 'Company', 'Nationality', 'Room', 'Check In', 'Expired Date', 'Restaurant', 'Status', 'Created At'];
        break;

      case 'cards':
        data = await prisma.card.findMany({
          select: {
            id: true,
            cardType: true,
            validFrom: true,
            validTo: true,
            usageCount: true,
            maxUsage: true,
            isActive: true,
            createdAt: true,
            guest: {
              select: {
                firstName: true,
                lastName: true,
                nationalId: true,
                restaurant: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        });
        reportTitle = 'Cards Report';
        headers = ['ID', 'Card Type', 'Guest Name', 'National ID', 'Restaurant', 'Valid From', 'Valid To', 'Usage', 'Max Usage', 'Status', 'Created At'];
        break;

      case 'scans':
        data = await prisma.scanLog.findMany({
          select: {
            id: true,
            stationId: true,
            isSuccess: true,
            errorMessage: true,
            scanTime: true,
            card: {
              select: {
                id: true,
                guest: {
                  select: {
                    firstName: true,
                    lastName: true,
                    restaurant: {
                      select: {
                        name: true
                      }
                    }
                  }
                }
              }
            }
          },
          orderBy: {
            scanTime: 'desc'
          },
          take: 1000 // Limit to recent scans
        });
        reportTitle = 'Scan Logs Report';
        headers = ['ID', 'Card ID', 'Guest Name', 'Restaurant', 'Station ID', 'Status', 'Error Message', 'Scan Time'];
        break;

      case 'accommodation':
        // Get accommodation scan data from scan logs
        data = await prisma.scanLog.findMany({
          select: {
            id: true,
            stationId: true,
            isSuccess: true,
            errorMessage: true,
            scanTime: true,
            card: {
              select: {
                id: true,
                guest: {
                  select: {
                    firstName: true,
                    lastName: true,
                    roomNumber: true,
                    checkInDate: true,
                    expiredDate: true,
                    restaurant: {
                      select: {
                        name: true
                      }
                    }
                  }
                }
              }
            }
          },
          orderBy: {
            scanTime: 'desc'
          },
          take: 1000
        });
        reportTitle = 'Accommodation Scan Report';
        headers = ['ID', 'Card ID', 'Guest Name', 'Room Number', 'Check In', 'Expired Date', 'Restaurant', 'Station ID', 'Status', 'Error Message', 'Scan Time'];
        break;

      case 'system':
        // System report with general statistics
        const [usersCount, restaurantsCount, guestsCount, cardsCount, scansCount] = await Promise.all([
          prisma.user.count(),
          prisma.restaurant.count(),
          prisma.guest.count(),
          prisma.card.count(),
          prisma.scanLog.count()
        ]);
        
        data = [
          { metric: 'Total Users', value: usersCount },
          { metric: 'Total Restaurants', value: restaurantsCount },
          { metric: 'Total Guests', value: guestsCount },
          { metric: 'Total Cards', value: cardsCount },
          { metric: 'Total Scans', value: scansCount },
          { metric: 'Report Generated', value: new Date().toISOString() }
        ];
        reportTitle = 'System Statistics Report';
        headers = ['Metric', 'Value'];
        break;

      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    // Format data based on export format
    switch (format) {
      case 'pdf':
        return await generatePDFReport(data, reportTitle, headers, type);
      case 'excel':
        return generateExcelReport(data, reportTitle, headers, type);
      case 'word':
        return await generateWordReport(data, reportTitle, headers, type);
      case 'svg':
        return generateSVGReport(data, reportTitle, type);
      default:
        return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    }
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function generatePDFReport(data: ReportData[], title: string, headers: string[], type: string) {
  try {
    // Enhanced HTML with better styling
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            color: #333;
          }
          h1 { 
            color: #2c3e50; 
            text-align: center; 
            margin-bottom: 30px;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 10px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 1px; 
            text-align: left; 
          }
          th { 
            background-color: #3498db; 
            color: white;
            font-weight: bold;
          }
          tr:nth-child(even) { 
            background-color: #f8f9fa; 
          }
          tr:hover {
            background-color: #e8f4fd;
          }
          .footer { 
            margin-top: 30px; 
            text-align: center; 
            font-size: 12px; 
            color: #666; 
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              ${headers.map(header => `<th>${header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => 
              `<tr>${formatRowData(row, type).map(cell => 
                `<td>${String(cell || '-')}</td>`
              ).join('')}</tr>`
            ).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p> Meals System - Report Generated: ${new Date().toISOString()}</p>
        </div>
      </body>
      </html>
    `;

    // Launch puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });
    
    await browser.close();

    return new NextResponse(pdfBuffer as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${title.replace(/\s+/g, '_')}.pdf"`
      }
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    // Fallback to HTML if PDF generation fails
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              ${headers.map(header => `<th>${header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => 
              `<tr>${formatRowData(row, type).map(cell => 
                `<td>${String(cell || '-')}</td>`
              ).join('')}</tr>`
            ).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p> Meals System - Report Generated: ${new Date().toISOString()}</p>
        </div>
      </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="${title.replace(/\s+/g, '_')}.html"`
      }
    });
  }
}

function generateExcelReport(data: ReportData[], title: string, headers: string[], type: string) {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();
  
  // Prepare data for Excel
  const worksheetData = [
    headers, // Header row
    ...data.map(row => formatRowData(row, type)) // Data rows
  ];
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Set column widths for better readability
  const columnWidths = headers.map(() => ({ wch: 20 }));
  worksheet['!cols'] = columnWidths;
  
  // Style the header row
  const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellAddress]) continue;
    worksheet[cellAddress].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "366092" } },
      alignment: { horizontal: "center", vertical: "center" }
    };
  }
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, title.substring(0, 31)); // Excel sheet name limit
  
  // Generate Excel buffer
  const excelBuffer = XLSX.write(workbook, { 
    type: 'buffer', 
    bookType: 'xlsx' 
  });

  return new NextResponse(excelBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${title.replace(/\s+/g, '_')}.xlsx"`
    }
  });
}

async function generateWordReport(data: ReportData[], title: string, headers: string[], type: string) {
  // Create table rows
  const tableRows = [
    // Header row
    new TableRow({
      children: headers.map(header => 
        new TableCell({
          children: [new Paragraph({ text: header, alignment: AlignmentType.CENTER })],
          width: { size: 2000, type: WidthType.DXA }
        })
      )
    }),
    // Data rows
    ...data.map(row => 
      new TableRow({
        children: formatRowData(row, type).map(cell => 
          new TableCell({
            children: [new Paragraph({ text: String(cell || '-') })],
            width: { size: 2000, type: WidthType.DXA }
          })
        )
      })
    )
  ];

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          text: title,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER
        }),
        new Paragraph({
          text: `Generated on: ${new Date().toLocaleString()}`,
          alignment: AlignmentType.CENTER
        }),
        // Add spacing
        new Paragraph({ text: "" }),
        
        new Table({
          rows: tableRows,
          width: {
            size: 100,
            type: WidthType.PERCENTAGE
          }
        }),
        
        new Paragraph({ text: "" }),
        new Paragraph({
          text: ` Meals System - Report Generated: ${new Date().toISOString()}`,
          alignment: AlignmentType.CENTER
        })
      ]
    }]
  });

  // Generate Word document buffer
  const wordBuffer = await Packer.toBuffer(doc);

  return new NextResponse(wordBuffer as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${title.replace(/\s+/g, '_')}.docx"`
    }
  });
}

function generateSVGReport(data: ReportData[], title: string, type: string) {
  const width = 800;
  const height = 600;
  const barWidth = 60;
  const maxValue = Math.max(...data.map(row => getNumericValue(row, type)));
  
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f8f9fa"/>
      
      <text x="${width/2}" y="30" text-anchor="middle" font-size="20" font-weight="bold" fill="#2c3e50">
        ${title}
      </text>
      
      <g transform="translate(50, 80)">
        ${data.slice(0, 10).map((row, index) => {
          const value = getNumericValue(row, type);
          const barHeight = (value / maxValue) * 400;
          const x = index * (barWidth + 20);
          const y = 400 - barHeight;
          
          return `
            <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#3498db" stroke="#2980b9"/>
            <text x="${x + barWidth/2}" y="${y - 10}" text-anchor="middle" font-size="10" fill="#2c3e50">
              ${getRowLabel(row, type)}
            </text>
            <text x="${x + barWidth/2}" y="${y + barHeight + 15}" text-anchor="middle" font-size="12">
              ${value}
            </text>
          `;
        }).join('')}
      </g>
      
      <text x="50" y="550" font-size="10" fill="#666">
         Meals System - ${new Date().toISOString()}
      </text>
    </svg>
  `;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Content-Disposition': `attachment; filename="${title.replace(/\s+/g, '_')}.svg"`
    }
  });
}

function formatRowData(row: ReportData, type: string): string[] {
  switch (type) {
    case 'users':
      return [
        String(row.id || ''),
        String(row.username || ''),
        String(row.role || ''),
        row.isActive ? 'Active' : 'Inactive',
        row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '',
        row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : ''
      ];
    
    case 'restaurants':
      return [
        String(row.id || ''),
        String(row.name || ''),
        String(row.nameAr || ''),
        String(row.location || ''),
        row.isActive ? 'Active' : 'Inactive',
        String(row._count?.guests || 0), // guests count placeholder
        String(row._count?.mealTimes || 0), // mealTime count placeholder
        row.createdAt ? new Date(row.createdAt).toLocaleDateString() : ''
      ];
    
    case 'guests':
      return [
        String(row.id || ''),
        String(row.firstName || ''),
        String(row.lastName || ''),
        String(row.nationalId || ''),
        String(row.company || ''),
        String(row.jobTitle || ''),
        String(row.nationality || ''),
        String(row.roomNumber || ''),
        row.checkInDate ? new Date(row.checkInDate).toLocaleDateString() : '',
        row.expiredDate ? new Date(row.expiredDate).toLocaleDateString() : '',
        String(row.restaurant?.name || ''),
        row.isActive ? 'Active' : 'Inactive',
        row.createdAt ? new Date(row.createdAt).toLocaleDateString() : ''
      ];
    
    case 'cards':
      return [
        String(row.id || ''),
        String(row.cardType || ''),
        `${String(row.guest?.firstName || '')} ${String(row.guest?.lastName || '')}`.trim(),
        String(row.guest?.nationalId || ''),
        String(row.guest?.restaurant?.name || ''),
        row.validFrom ? new Date(row.validFrom).toLocaleDateString() : '',
        row.validTo ? new Date(row.validTo).toLocaleDateString() : '',
        String(row.usageCount || 0),
        String(row.maxUsage || 0),
        row.isActive ? 'Active' : 'Inactive',
        row.createdAt ? new Date(row.createdAt).toLocaleDateString() : ''
      ];
    
    case 'accommodation':
      const guestData = row.card?.guest || row.guest;
      const restaurantName = row.card?.guest?.restaurant?.name || '';
      return [
        String(row.id || ''),
        String(row.card?.id || ''),
        guestData ? `${String(guestData.firstName || '')} ${String(guestData.lastName || '')}`.trim() : '',
        String(guestData?.roomNumber || ''),
        guestData?.checkInDate ? new Date(guestData.checkInDate).toLocaleDateString() : '',
        guestData?.expiredDate ? new Date(guestData.expiredDate).toLocaleDateString() : '',
        String(restaurantName || ''),
        String(row.stationId || ''),
        row.isSuccess ? 'Success' : 'Failed',
        String(row.errorMessage || ''),
        row.scanTime ? new Date(row.scanTime).toLocaleString() : ''
      ];
    
    case 'scans':
      return [
        String(row.id || ''),
        String(row.card?.id || ''),
        row.card?.guest ? `${String(row.card.guest.firstName || '')} ${String(row.card.guest.lastName || '')}`.trim() : '',
        String(row.card?.guest?.restaurant?.name || ''),
        String(row.stationId || ''),
        row.isSuccess ? 'Success' : 'Failed',
        String(row.errorMessage || ''),
        row.scanTime ? new Date(row.scanTime).toLocaleString() : ''
      ];
    
    case 'system':
      return [
        String(row.metric || ''),
        String(row.value || '')
      ];
    
    default:
      return Object.values(row).map(val => String(val || ''));
  }
}

function getNumericValue(row: ReportData, type: string): number {
  switch (type) {
    case 'cards':
      return row.usageCount || 0;
    case 'system':
      return typeof row.value === 'number' ? row.value : 0;
    default:
      return 1;
  }
}

function getRowLabel(row: ReportData, type: string): string {
  switch (type) {
    case 'restaurants':
      return String(row.name || 'Unknown');
    case 'cards':
      return row.guest ? `${String(row.guest.firstName || '')} ${String(row.guest.lastName || '')}`.trim() : 'Unknown';
    case 'system':
      return String(row.metric || 'Unknown');
    default:
      return String(row.name || row.id || 'Item');
  }
}