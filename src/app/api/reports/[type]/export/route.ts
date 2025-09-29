import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/jwt';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType, HeadingLevel } from 'docx';

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
  checkOutDate?: Date | string | null;
  restaurant?: { name?: string };
  guest?: {
    firstName?: string;
    lastName?: string;
    nationalId?: string | null;
    roomNumber?: string | null;
    checkInDate?: Date | string | null;
    checkOutDate?: Date | string | null;
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
      checkOutDate?: Date | string | null;
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
        headers = ['ID', 'Name', 'Name (Arabic)', 'Location', 'Status', 'Guests Count', 'Meal Times', 'Created At'];
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
            checkOutDate: true,
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
        headers = ['ID', 'First Name', 'Last Name', 'National ID', 'Company', 'Job Title', 'Nationality', 'Room', 'Check In', 'Check Out', 'Restaurant', 'Status', 'Created At'];
        break;

      case 'cards':
        data = await prisma.card.findMany({
          select: {
            id: true,
            cardType: true,
            validFrom: true,
            validTo: true,
            maxUsage: true,
            usageCount: true,
            isActive: true,
            createdAt: true,
            guest: {
              select: {
                firstName: true,
                lastName: true,
                nationalId: true
              }
            },
            mealTime: {
              select: {
                name: true
              }
            }
          }
        });
        reportTitle = 'Cards Report';
        headers = ['ID', 'Type', 'Guest Name', 'National ID', 'Meal Time', 'Valid From', 'Valid To', 'Usage', 'Max Usage', 'Status', 'Created At'];
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
                    lastName: true
                  }
                }
              }
            },
            guest: {
              select: {
                restaurant: {
                  select: {
                    name: true
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
                    checkOutDate: true
                  }
                }
              }
            },
            guest: {
              select: {
                firstName: true,
                lastName: true,
                roomNumber: true,
                checkInDate: true,
                checkOutDate: true,
                restaurant: {
                  select: {
                    name: true
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
        headers = ['ID', 'Card ID', 'Guest Name', 'Room Number', 'Check In', 'Check Out', 'Restaurant', 'Station ID', 'Status', 'Error Message', 'Scan Time'];
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
        return generatePDFReport(data, reportTitle, headers, type);
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

function generatePDFReport(data: ReportData[], title: string, headers: string[], type: string) {
  // Simple HTML-to-PDF approach
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
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
            `<tr>${formatRowData(row, type).map(cell => `<td>${String(cell || '-')}</td>`).join('')}</tr>`
          ).join('')}
        </tbody>
      </table>
      <div class="footer">
        <p>AML Meals System - Report Generated: ${new Date().toISOString()}</p>
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
  const columnWidths = headers.map(() => ({ wch: 15 }));
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
  
  // Generate Excel file buffer
  const excelBuffer = XLSX.write(workbook, { 
    type: 'buffer', 
    bookType: 'xlsx',
    compression: true
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
          children: [new Paragraph({
            text: header,
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_6
          })],
          width: { size: 2000, type: WidthType.DXA }
        })
      )
    }),
    // Data rows
    ...data.map(row => 
      new TableRow({
        children: formatRowData(row, type).map(cell => 
          new TableCell({
            children: [new Paragraph({
              text: String(cell || '-'),
              alignment: AlignmentType.LEFT
            })],
            width: { size: 2000, type: WidthType.DXA }
          })
        )
      })
    )
  ];

  // Create the document
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Title
        new Paragraph({
          text: title,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER
        }),
        
        // Generation date
        new Paragraph({
          text: `Generated on: ${new Date().toLocaleString()}`,
          alignment: AlignmentType.CENTER
        }),
        
        // Empty paragraph for spacing
        new Paragraph({ text: "" }),
        
        // Data table
        new Table({
          rows: tableRows,
          width: {
            size: 100,
            type: WidthType.PERCENTAGE
          }
        }),
        
        // Footer
        new Paragraph({ text: "" }),
        new Paragraph({
          text: `AML Meals System - Report Generated: ${new Date().toISOString()}`,
          alignment: AlignmentType.CENTER
        })
      ]
    }]
  });

  // Generate Word document buffer
  const wordBuffer = await Packer.toBuffer(doc);
  
  return new NextResponse(new Uint8Array(wordBuffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${title.replace(/\s+/g, '_')}.docx"`
    }
  });
}

function generateSVGReport(data: ReportData[], title: string, type: string) {
  // Generate simple SVG chart for numeric data
  const svg = `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white"/>
      <text x="400" y="30" text-anchor="middle" font-size="20" font-weight="bold">${title}</text>
      <text x="400" y="50" text-anchor="middle" font-size="12">Generated: ${new Date().toLocaleDateString()}</text>
      
      <!-- Simple data visualization -->
      <g transform="translate(50, 80)">
        ${data.slice(0, 10).map((row, index) => {
          const y = index * 40;
          const value = getNumericValue(row, type);
          const barWidth = Math.max(10, (value / Math.max(...data.slice(0, 10).map(r => getNumericValue(r, type)))) * 300);
          
          return `
            <rect x="0" y="${y}" width="${barWidth}" height="30" fill="#3b82f6" opacity="0.7"/>
            <text x="10" y="${y + 20}" font-size="12" fill="white">${getRowLabel(row, type)}</text>
            <text x="${barWidth + 10}" y="${y + 20}" font-size="12">${value}</text>
          `;
        }).join('')}
      </g>
      
      <text x="400" y="580" text-anchor="middle" font-size="10" fill="#666">
        AML Meals System - ${new Date().toISOString()}
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
        String(row._count?.guests || 0),
        '0', // mealTimes count placeholder
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
        row.checkOutDate ? new Date(row.checkOutDate).toLocaleDateString() : '',
        String(row.restaurant?.name || 'N/A'),
        row.isActive ? 'Active' : 'Inactive',
        row.createdAt ? new Date(row.createdAt).toLocaleDateString() : ''
      ];
    
    case 'cards':
      return [
        String(row.id || ''),
        String(row.cardType || ''),
        `${String(row.guest?.firstName || '')} ${String(row.guest?.lastName || '')}`.trim(),
        String(row.guest?.nationalId || ''),
        'N/A', // mealTime name placeholder
        row.validFrom ? new Date(row.validFrom).toLocaleDateString() : '',
        row.validTo ? new Date(row.validTo).toLocaleDateString() : '',
        String(row.usageCount || 0),
        String(row.maxUsage || 0),
        row.isActive ? 'Active' : 'Inactive',
        row.createdAt ? new Date(row.createdAt).toLocaleDateString() : ''
      ];
      case 'accommodation':
        const guestData = row.card?.guest || row.guest;
        return [
          String(row.id || ''),
          String(row.card?.id || ''),
          guestData ? `${String(guestData.firstName || '')} ${String(guestData.lastName || '')}`.trim() : '',
          String(guestData?.roomNumber || ''),
          guestData?.checkInDate ? new Date(guestData.checkInDate).toLocaleDateString() : '',
          guestData?.checkOutDate ? new Date(guestData.checkOutDate).toLocaleDateString() : '',
          String(row.guest?.restaurant?.name || ''),
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
        String(row.guest?.restaurant?.name || ''),
        String(row.stationId || ''),
        row.isSuccess ? 'Success' : 'Failed',
        String(row.errorMessage || ''),
        row.scanTime ? new Date(row.scanTime).toLocaleString() : ''
      ];
    
    case 'system':
      return [String(row.metric || ''), String(row.value || '')];
    
    default:
      return Object.values(row).map(String);
  }
}

function getNumericValue(row: ReportData, type: string): number {
  switch (type) {
    case 'restaurants':
      return row._count?.guests || 0;
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
      return row.guest ? `${String(row.guest.firstName || '')} ${String(row.guest.lastName || '')}` : 'Unassigned';
    case 'system':
      return String(row.metric || 'Unknown');
    default:
      return String(row.name || row.id || 'Item');
  }
}
