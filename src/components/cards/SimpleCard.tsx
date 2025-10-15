'use client';

import React from 'react';
import Image from 'next/image';


interface CardData {
  id: string;
  guestId: string;
  cardNumber: string;
  cardType: string;
  expiryDate: string;
  mealTimeIds: string[];
}

interface SimpleCardProps {
  cardData: CardData;
  qrCodeDataURL: string;
}

const SimpleCard: React.FC<SimpleCardProps> = ({ cardData, qrCodeDataURL }) => {
  return (
    <>
      <style jsx>{`
        @page {
          size: 85.6mm 53.98mm; /* Standard credit card size */
          margin: 0;
        }
        
        .card-container {
          margin: 0;
          padding: 6px;
          font-family: Arial, sans-serif;
          font-size: 9px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-sizing: border-box;
          height: 53.98mm;
          width: 85.6mm;
          position: relative;
        }
        
        .card-header {
          text-align: center;
          margin-bottom: 3px;
        }
        
        .card-title {
          font-size: 11px;
          font-weight: bold;
          margin: 0;
        }
        
        .card-number {
          font-size: 7px;
          margin: 1px 0;
        }
        
        .card-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: calc(100% - 25px);
        }
        
        .card-info {
          flex: 1;
          padding-right: 6px;
        }
        
        .info-row {
          margin: 1px 0;
          font-size: 7px;
        }
        
        .qr-code {
          width: 38mm;
          height: 38mm;
          background: white;
          padding: 3px;
          border-radius: 3px;
          border: 1px solid #ddd;
        }
        
        .qr-code img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        .expiry {
          position: absolute;
          bottom: 4px;
          right: 8px;
          font-size: 7px;
        }
      `}</style>
      
      <div className="card-container">
        <div className="card-header">
          <h1 className="card-title">MEALS</h1>
          <div className="card-number">Card: {cardData.cardNumber}</div>
        </div>
        <div className="card-content">
          <div className="card-info">
            <div className="info-row"><strong>Type:</strong> {cardData.cardType}</div>
            <div className="info-row"><strong>Guest:</strong> {cardData.guestId}</div>
            <div className="info-row"><strong>Meals:</strong> {cardData.mealTimeIds.length}</div>
          </div>
          <div className="qr-code">
            <Image 
              src={qrCodeDataURL} 
              alt="QR Code" 
              width={120}
              height={120}
              unoptimized
            />
          </div>
        </div>
        <div className="expiry">
          Expires: {new Date(cardData.expiryDate).toLocaleDateString()}
        </div>
      </div>
    </>
  );
};

export default SimpleCard;