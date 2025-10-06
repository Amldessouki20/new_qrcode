'use client';

import { QRCodeSVG } from 'qrcode.react';
import { useTranslations } from 'next-intl';
import { parseCardDataString } from '@/lib/qr-generator';
import { format } from 'date-fns';
import { User, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Card {
  id: string;
  cardData: string;
  cardType: 'QR' | 'RFID';
  validFrom: string;
  validTo: string;
  isActive: boolean;
  guest: {
    firstName: string;
    lastName: string;
    nationalId: string;
    passportNo: string;
    nationality: string;
    company?: string | undefined;
    jobTitle?: string | undefined;
    roomNumber?: string | undefined;
    restaurant: {
      name: string;
      nameAr?: string | undefined;
      location?: string | undefined;
      restaurantType?: string | undefined;
    };
  };
  mealTime?: {
    name: string;
    startTime: string;
    endTime: string;
  };
  // maxUsage: number;
  usageCount?: number;
}

interface PrintMultipleCardsProps {
  cards: Card[];
}

export function PrintMultipleCards({ cards }: PrintMultipleCardsProps) {
  const t = useTranslations('cards');
  const locale = 'ar'; // يمكن تمريرها كـ prop
  const isArabic = locale === 'ar';

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    window.close();
  };

  return (
    <div className="min-h-screen bg-white">
      <style jsx global>{`
        @media print {
   .print-card {
    width: 85.6mm !important;
    height: 53.98mm !important;
    transform: scale(1) !important;
      }
          
          body { 
            margin: 0; 
            padding: 0; 
            background: white !important;
          }
          
          .no-print { 
            display: none !important; 
          }
          
          .print-container {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8mm !important;
            margin: 0 !important;
            padding: 8mm !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          
          .print-card {
            width: 85.6mm !important;
            height: auto !important;
            min-height: 54mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            font-family: Arial, sans-serif !important;
            page-break-inside: avoid !important;
            background: linear-gradient(135deg, #93c5fd 0%, #6366f1 100%) !important;
            border: 1px solid #3b82f6 !important;
            border-radius: 8px !important;
            overflow: visible !important;
            position: relative !important;
          }
          
          .print-card .bg-gradient-to-br {
            background: linear-gradient(135deg, #93c5fd 0%, #6366f1 100%) !important;
          }
          
          .print-card .text-white {
            color: white !important;
          }
          
          .print-card .text-blue-700 {
            color: #1d4ed8 !important;
          }
          
          .print-card .text-gray-800 {
            color: #1f2937 !important;
          }
          
          .print-card .text-gray-700 {
            color: #374151 !important;
          }
          
          .print-card .text-gray-600 {
            color: #4b5563 !important;
          }
          
          .print-card .text-gray-500 {
            color: #6b7280 !important;
          }
          
          .print-card .bg-white\/90,
          .print-card .bg-white {
            background-color: rgba(255, 255, 255, 0.95) !important;
          }
          
          .print-card .bg-blue-50\/80 {
            background-color: rgba(239, 246, 255, 0.9) !important;
          }
          
          .print-card .bg-gray-50\/80 {
            background-color: rgba(249, 250, 251, 0.9) !important;
          }
          
          .print-card .border-blue-200 {
            border-color: #bfdbfe !important;
          }
          
          .print-card .border-blue-300 {
            border-color: #93c5fd !important;
          }
          
          .print-card .border-gray-100 {
            border-color: #f3f4f6 !important;
          }
          
          .print-card .space-y-3 > * + * {
            margin-top: 0.75rem !important;
          }
          
          .print-card .space-y-2 > * + * {
            margin-top: 0.5rem !important;
          }
          
          .print-card .space-y-1 > * + * {
            margin-top: 0.25rem !important;
          }
          
          .print-card .p-4 {
            padding: 1rem !important;
          }
          
          .print-card .p-3 {
            padding: 0.75rem !important;
          }
          
          .print-card .py-3 {
            padding-top: 0.75rem !important;
            padding-bottom: 0.75rem !important;
          }
          
          .print-card .pb-3 {
            padding-bottom: 0.75rem !important;
          }
          
          .print-card .mb-2 {
            margin-bottom: 0.5rem !important;
          }
          
          .print-card .mb-1 {
            margin-bottom: 0.25rem !important;
          }
          
          .print-card .mt-2 {
            margin-top: 0.5rem !important;
          }
          
          .print-card .gap-2 {
            gap: 0.5rem !important;
          }
          
          .print-card .gap-3 {
            gap: 0.75rem !important;
          }
          
          .print-card .gap-1 {
            gap: 0.25rem !important;
          }
          
          .print-card .rounded-lg {
            border-radius: 0.5rem !important;
          }
          
          .print-card .rounded-md {
            border-radius: 0.375rem !important;
          }
          
          .print-card .flex {
            display: flex !important;
          }
          
          .print-card .flex-col {
            flex-direction: column !important;
          }
          
          .print-card .items-center {
            align-items: center !important;
          }
          
          .print-card .justify-center {
            justify-content: center !important;
          }
          
          .print-card .justify-between {
            justify-content: space-between !important;
          }
          
          .print-card .text-center {
            text-align: center !important;
          }
          
          .print-card .w-full {
            width: 100% !important;
          }
          
          .print-card .flex-1 {
            flex: 1 1 0% !important;
          }
          
          .print-card .flex-shrink-0 {
            flex-shrink: 0 !important;
          }
          
          .print-card .truncate {
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
          }
          
          .print-card .grid {
            display: grid !important;
          }
          
          .print-card .grid-cols-1 {
            grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
          }
          
          .print-card .border-b {
            border-bottom-width: 1px !important;
          }
          
          .print-card .border-2 {
            border-width: 2px !important;
          }
          
          .print-card .shadow-sm {
            box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05) !important;
          }
        }
        
        .print-container {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 20px;
          padding: 20px;
        }
        
        @media screen {
          .print-card {
            max-width: 320px;
          }
        }
      `}</style>
      
      <div className="no-print p-4 bg-gray-100 fit-content-width">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">{t('print.title')}</h1>
            <div className="space-x-2">
              <button 
                onClick={handlePrint}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                {t('print.print')}
              </button>
              <button 
                onClick={handleClose}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                {t('print.actions.close')}
              </button>
            </div>
          </div>
          <p className="text-gray-600 mb-4">
            {t('print.description')} ({cards.length} {t('print.title')})
          </p>
        </div>
      </div>

      <div className="print-container">
        {cards.map((card) => {
          // استخراج بيانات الوجبات من cardData
          const parsedCardData = parseCardDataString(card.cardData);
          const allowedMealTimes = parsedCardData?.allowedMealTimes || [];
          
          const restaurantName = isArabic && card.guest.restaurant.nameAr 
            ? card.guest.restaurant.nameAr 
            : card.guest.restaurant.name;

          const guestName = isArabic 
            ? `${card.guest.lastName} ${card.guest.firstName}`
            : `${card.guest.firstName} ${card.guest.lastName}`;
          
          return (
            <Card key={card.id} className={`print-card mx-auto bg-gradient-to-br from-blue-300 to-indigo-400 border border-blue-300 shadow-lg print:shadow-none ${isArabic ? 'rtl' : 'ltr'}`}>
              <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="text-center border-b border-blue-200 pb-3">
                  <div className="flex items-center justify-center gap-2 mb-1 flex-col">
                    {/* <CreditCard className="h-5 w-5 text-white" /> */}
                    <h3 className="font-bold text-base text-white truncate">
                     ReataurantName: {restaurantName}
                    </h3>
                    <p className='font-bold text-base text-white'> Type:{card.guest.restaurant.restaurantType}</p>
                  </div>
                  {card.guest.restaurant.location && (
                    <p className="text-xs text-blue-100 opacity-90">
                      Location: {card.guest.restaurant.location}
                    </p>
                  )}
                </div>

                {/* Guest Information */}
                <div className='flex flex-col gap-3 justify-center items-center'>
                  <div className="bg-white/90 rounded-lg p-3 space-y-2 w-full">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <p className="font-bold text-sm text-gray-800 truncate flex-1">{guestName}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-1 text-xs">
                      {card.guest.nationalId && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 font-medium">{isArabic ? 'ID:' : 'ID:'}</span>
                          <span className="text-gray-700 truncate">{card.guest.nationalId}</span>
                        </div>
                      )}
                      {card.guest.passportNo && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 font-medium">{isArabic ? 'جواز السفر:' : 'Passport:'}</span>
                          <span className="text-gray-700 truncate">{card.guest.passportNo}</span>
                        </div>
                      )}
                      {card.guest.nationality && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 font-medium">{isArabic ? 'Nationality:' : 'Nationality:'}</span>
                          <span className="text-gray-700 truncate">{card.guest.nationality}</span>
                        </div>
                      )}
                      {card.guest.company && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 font-medium">{isArabic ? 'Company:' : 'Company:'}</span>
                          <span className="text-gray-700 truncate">{card.guest.company}</span>
                        </div>
                      )}
                      {card.guest.jobTitle && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 font-medium">{isArabic ? 'المنصب:' : 'Job Title:'}</span>
                          <span className="text-gray-700 truncate">{card.guest.jobTitle}</span>
                        </div>
                      )}
                      {card.guest.roomNumber && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 font-medium">{isArabic ? 'Room:' : 'Room:'}</span>
                          <span className="text-gray-700 truncate">{card.guest.roomNumber}</span>
                        </div>
                      )}
                    </div>
                      
                    {/* عرض الوجبات المتعددة */}
                    {allowedMealTimes.length > 0 ? (
                      <div className="bg-blue-50/80 rounded-lg p-3 space-y-2 w-full">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-700">
                            {isArabic ? 'Allowed Meals :' : 'Allowed Meals:'}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {allowedMealTimes.map((mealTime, index) => (
                            <div key={index} className="bg-white rounded-md px-3 py-2 border border-blue-200">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-blue-700">{mealTime.name}</span>
                                <span className="text-xs text-gray-600 font-mono">
                                  {mealTime.startTime} - {mealTime.endTime}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : card.mealTime && (
                      <div className="bg-blue-50/80 rounded-lg p-3 w-full">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-blue-700">
                            {Array.isArray(card.mealTime.name) ? card.mealTime.name.join(', ') : card.mealTime.name}
                          </span>
                          <span className="text-xs text-gray-600 font-mono">
                            {card.mealTime.startTime} - {card.mealTime.endTime}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* معلومات الصلاحية والاستخدام */}
                    <div className="bg-gray-50/80 rounded-lg p-3 space-y-2 w-full">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-600">
                          {isArabic ? 'Valid:' : 'Valid:'}
                        </span>
                        <span className="text-xs text-gray-700 font-mono">
                          {format(new Date(card.validFrom), 'dd/MM/yy')} - {format(new Date(card.validTo), 'dd/MM/yy')}
                        </span>
                      </div>
                      {(card.maxUsage || card.usageCount !== undefined) && (
                        <div className="flex justify-between items-center">
                          {/* <span className="text-xs font-medium text-gray-600">
                            {isArabic ? 'Usage:' : 'Usage:'}
                          </span> */}
                          {/* <span className="text-xs text-gray-700 font-mono">
                            {card.usageCount || 0}{card.maxUsage ? `/${card.maxUsage}` : ''}
                          </span> */}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* QR Code Section */}
                  <div className="flex justify-center py-3">
                    <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                      <QRCodeSVG
                        value={card.cardData}
                        size={120}
                        level="H"
                        includeMargin={true}
                        marginSize={2}
                        bgColor="#FFFFFF"
                        fgColor="#000000"
                        className="border-2 border-gray-100 rounded-md"
                      />
                      <p className="text-xs text-gray-500 mt-2 font-mono tracking-wider">
                        {card.id.slice(-8).toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>
                

                {/* Footer */}
               
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}