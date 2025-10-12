'use client';

import React from 'react';
import Image from 'next/image';

interface PrintableCardProps {
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
    profileImagePath?: string | null;
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
  qrCodeDataUrl?: string;
  options?: {
    cardSize?: 'standard' | 'large' | 'small';
    orientation?: 'portrait' | 'landscape';
  };
}

const PrintableCard: React.FC<PrintableCardProps> = ({
  card,
  guest,
  restaurant,
  mealTimes,
  qrCodeDataUrl,
  options = {}
}) => {
  const { cardSize = 'standard', orientation = 'portrait' } = options;

  // Card dimensions based on size
  const dimensions = {
    standard: { width: '85.6mm', height: '53.98mm' },
    large: { width: '100mm', height: '65mm' },
    small: { width: '70mm', height: '45mm' },
  };

  const cardDimensions = dimensions[cardSize];
  const isLandscape = orientation === 'landscape';
  const finalWidth = isLandscape ? cardDimensions.height : cardDimensions.width;
  const finalHeight = isLandscape ? cardDimensions.width : cardDimensions.height;

  const isExpired = new Date(card.validTo) < new Date();

  return (
    <>
      <style jsx>{`
        @media print {
          body { margin: 0; padding: 0; }
          .no-print { display: none; }
        }
        
        .card {
          width: ${finalWidth};
          height: ${finalHeight};
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 8px;
          padding: 12px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          color: white;
          position: relative;
          overflow: hidden;
          margin: 0 auto;
          font-family: Arial, sans-serif;
        }
        
        .card::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 100%;
          height: 100%;
          background: rgba(255,255,255,0.1);
          transform: rotate(45deg);
        }
        
        .header {
          text-align: center;
          margin-bottom: 8px;
          position: relative;
          z-index: 1;
        }
        
        .restaurant-name {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 2px;
        }
        
        .guest-info {
          position: relative;
          z-index: 1;
          margin-bottom: 8px;
        }
        
        .guest-name {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 2px;
        }
        
        .guest-details {
          font-size: 10px;
          opacity: 0.9;
        }
        
        .meal-times {
          font-size: 10px;
          margin-bottom: 10px;
          position: relative;
          z-index: 1;
          background: rgba(255,255,255,0.1);
          padding: 6px;
          border-radius: 4px;
          max-width: 140px;
        }
        
        .meal-time {
          margin-bottom: 2px;
          padding: 1px 0;
          border-bottom: 1px solid rgba(255,255,255,0.2);
          font-size: 9px;
        }
        
        .meal-time:last-child {
          border-bottom: none;
        }
        
        .qr-section {
          position: absolute;
          bottom: 6px;
          right: 6px;
          background: white;
          padding: 3px;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          border: 1px solid #ddd;
        }
        
        .qr-code {
          width: 120px;
          height: 120px;
          border: 1px solid #333;
          border-radius: 2px;
        }
        
        .card-info {
          position: absolute;
          bottom: 8px;
          left: 8px;
          font-size: 8px;
          opacity: 0.8;
          max-width: 100px;
        }
        
        .validity {
          position: absolute;
          bottom: 25px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 7px;
          opacity: 0.9;
          background: rgba(255,255,255,0.9);
          padding: 2px 4px;
          border-radius: 3px;
          white-space: nowrap;
          color: #000000;
          font-weight: bold;
        }
        
        .validity.invalid {
          color: #ff0000;
          background: rgba(255,255,255,0.95);
        }
        
        .print-button {
          margin: 20px auto;
          display: block;
          padding: 10px 20px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .print-button:hover {
          background: #5a67d8;
        }
      `}</style>
      
      <button 
        className="print-button no-print" 
        onClick={() => window.print()}
      >
        Print Card
      </button>
      
      <div className="card">
        <div className="header">
          <div className="restaurant-name">{restaurant.name}</div>
          {restaurant.location && (
            <div style={{ fontSize: '10px', opacity: 0.8 }}>
              {restaurant.location}
            </div>
          )}
        </div>
        
        <div className="guest-info">
          {guest.profileImagePath && (
            <Image
              src={guest.profileImagePath}
              alt={`${guest.firstName} ${guest.lastName}`}
              width={40}
              height={40}
              style={{ borderRadius: '50%', objectFit: 'cover', border: '1px solid #ddd', marginBottom: 6 }}
            />
          )}
          <div className="guest-name">
            {guest.firstName} {guest.lastName}
          </div>
          <div className="guest-details">
            {guest.company && guest.company}
            {guest.jobTitle && ` - ${guest.jobTitle}`}
          </div>
        </div>
        
        <div className="meal-times">
          <strong>Meal Times:</strong><br />
          {mealTimes.map((mt, index) => (
            <div key={index} className="meal-time">
              {mt.name}: {mt.startTime} - {mt.endTime}
            </div>
          ))}
        </div>
        
        {qrCodeDataUrl && (
          <div className="qr-section">
            <Image 
              src={qrCodeDataUrl} 
              alt="QR Code" 
              width={120}
              height={120}
              className="qr-code"
            />
          </div>
        )}
        
        <div className={`validity ${isExpired ? 'invalid' : ''}`}>
          Valid: {new Date(card.validFrom).toLocaleDateString()} - {new Date(card.validTo).toLocaleDateString()}
        </div>
        
        <div className="card-info">
          Card: {card.cardType}<br />
          ID: {card.id.slice(-8)}
        </div>
      </div>
    </>
  );
};

export default PrintableCard;