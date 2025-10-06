'use client';

import { generateQRCodeSVG } from '@/lib/qr-generator';

import { useEffect, useState } from 'react';

interface CardPreviewProps {
  card: {
    id: string;
    cardData: string;
    cardType: string;
    isActive: boolean;
    validFrom: Date;
    validTo: Date;
    // usageCount: number;
    // maxUsage: number | null;
    guest?: {
      firstName: string;
      lastName: string;
      nationalId: string;
      company?: string;
      religion?: string;
      restaurant?: {
        name: string;
      };
    } | null;
    mealTime?: {
      name: string;
      nameAr: string;
      startTime: string;
      endTime: string;
    } | null;
  };
  size?: 'small' | 'medium' | 'large';
}

export function CardPreview({ card, size = 'small' }: CardPreviewProps) {
  const [qrCodeSvg, setQrCodeSvg] = useState<string>('');

  useEffect(() => {
    const generateQR = async () => {
      try {
        const svg = await generateQRCodeSVG(card.cardData, {
          size: 400,
          margin: 4,
          errorCorrectionLevel: 'H',
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeSvg(svg);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };
    generateQR();
  }, [card.cardData]);

  const sizeClasses = {
    small: {
      container: 'w-40 h-24',
      text: 'text-xs',
      qr: 'w-14 h-14',
      padding: 'p-2'
    },
    medium: {
      container: 'w-64 h-40',
      text: 'text-sm',
      qr: 'w-20 h-20',
      padding: 'p-3'
    },
    large: {
      container: 'w-80 h-48',
      text: 'text-base',
      qr: 'w-24 h-24',
      padding: 'p-4'
    }
  };

  const currentSize = sizeClasses[size];
  const isActive = card.isActive && new Date(card.validTo) > new Date();

  return (
    <div className={`${currentSize.container} ${currentSize.padding} bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg relative overflow-hidden text-white`}>
      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-between">
        {/* Header Section - Restaurant Name */}
        <div className="text-center mb-2">
          <div className={`${currentSize.text === 'text-xs' ? 'text-sm' : currentSize.text === 'text-sm' ? 'text-base' : 'text-lg'} font-bold text-white`}>
            {card.guest?.restaurant?.name || 'Restaurant 66'}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex justify-between items-start flex-1">
          {/* Left Side - Guest Info */}
          <div className="flex-1 pr-3">
            {/* Guest Name */}
            <div className={`${currentSize.text} font-semibold text-white mb-1`}>
              {card.guest ? `${card.guest.firstName} ${card.guest.lastName}` : 'Unassigned Guest'}
            </div>
            
            {/* Company */}
            {card.guest?.company && (
              <div className="text-xs text-blue-100 mb-2">
                {card.guest.company}
              </div>
            )}
               {/* religion */}
            {card.guest?.religion && (
              <div className="text-xs text-blue-100 mb-2">
                {card.guest.religion}
              </div>
            )}
            
            {/* Meal Times Section */}
            {size !== 'small' && (
              <div className="bg-white bg-opacity-20 rounded-lg p-2 mb-2">
                <div className="text-xs font-semibold text-white mb-1">Meal Times:</div>
                <div className="text-xs text-blue-100 space-y-1">
                  <div>breakfast: 07:00 - 10:00</div>
                  <div>lunch: 12:00 - 15:00</div>
                  <div>dinner: 18:00 - 22:00</div>
                </div>
              </div>
            )}
            
            {/* Card ID and Validity */}
            <div className="text-xs text-blue-100">
              <div className="mb-1">
                <span className="font-medium">Card ID:</span> {card.id.slice(-8).toUpperCase()}
              </div>
              <div className="mb-1">
                <span className="font-medium">Valid:</span> {new Date(card.validFrom).toLocaleDateString()} - {new Date(card.validTo).toLocaleDateString()}
              </div>
              {card.guest?.nationalId && (
                <div>
                  <span className="font-medium">ID:</span> {card.guest.nationalId}
                </div>
              )}
            </div>
          </div>
          
          {/* Right Side - QR Code */}
          <div className="bg-white p-2 rounded-lg shadow-sm flex-shrink-0">
            <div 
              className={`${currentSize.qr} flex items-center justify-center`}
              dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
              style={{ minWidth: currentSize.qr?.split(' ')[0]?.replace('w-', '') + 'rem' }}
            />
          </div>
        </div>

        {/* Footer Section - Status */}
        <div className="flex justify-between items-end mt-2">
          <div className="text-xs text-blue-100">
            {card.mealTime && (
              <div>Current: {card.mealTime.name} ({card.mealTime.startTime} - {card.mealTime.endTime})</div>
            )}
          </div>
          
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            isActive
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {isActive ? 'Active' : 'Expired'}
          </div>
        </div>
      </div>
    </div>
  );
}