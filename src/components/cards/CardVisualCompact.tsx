"use client";

import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";
import { User, Clock } from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";
import { parseCardDataString } from "@/lib/qr-generator";

interface CardVisualCompactProps {
  card: {
    id: string;
    cardData: string;
    cardType: "QR" | "RFID";
    validFrom: string;
    validTo: string;
    isActive: boolean;
    guest: {
      firstName: string;
      lastName: string;
      profileImagePath?: string;
      nationalId?: string;
      passportNo?: string;
      nationality?: string;
      company?: string;
      religion?: string;
      jobTitle?: string;
      roomNumber?: string;
      restaurant: {
        name: string;
        nameAr?: string;
        location?: string;
        restaurantType?: string;
      };
    };
    mealTime?: {
      name: string;
      startTime: string;
      endTime: string;
    };
     maxUsage?: number;// i change here///
     usageCount?: number;
  };
  locale?: string;
}

export function CardVisualCompact({
  card,
  locale = "en",
}: CardVisualCompactProps) {
  const isArabic = locale === "ar";

  const restaurantName =
    isArabic && card.guest.restaurant.nameAr
      ? card.guest.restaurant.nameAr
      : card.guest.restaurant.name;

  const guestName = isArabic
    ? `${card.guest.lastName} ${card.guest.firstName}`
    : `${card.guest.firstName} ${card.guest.lastName}`;

  // استخراج بيانات الوجبات من cardData
  const parsedCardData = parseCardDataString(card.cardData);
  const allowedMealTimes = parsedCardData?.allowedMealTimes || [];

  return (
    <Card
      className={`w-full max-w-xs mx-auto bg-gradient-to-br from-blue-300 to-indigo-400 border border-blue-300 shadow-lg print:shadow-none ${
        isArabic ? "rtl" : "ltr"
      }`}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="text-center border-b border-blue-200 pb-3">
          <div className="flex items-center justify-center gap-2 mb-1 flex-col">
            {/* <CreditCard className="h-5 w-5 text-white" /> */}
            <h3 className="font-bold text-base text-white truncate">
              RestaurantName:{restaurantName}
            </h3>
            <p className="font-bold text-base text-white">
              {" "}
              Type:{card.guest.restaurant.restaurantType}
            </p>
          </div>
          {card.guest.restaurant.location && (
            <p className="text-xs text-blue-100 opacity-90">
              {card.guest.restaurant.location}
            </p>
          )}
        </div>

        {/* Guest Information */}
        <div className="flex flex-col gap-3 justify-center items-center">
          <div className="bg-white/90 rounded-lg p-3 space-y-2 w-full">
            <div className="flex items-center gap-2 mb-2">
              {card.guest.profileImagePath ? (
                <Image
                  src={card.guest.profileImagePath}
                  alt={guestName}
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-full object-cover border border-blue-200"
                />
              ) : (
                <User className="h-4 w-4 text-blue-600 flex-shrink-0" />
              )}
              <p className="font-bold text-sm text-gray-800 truncate flex-1">
                {guestName}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-1 text-xs">
              {card.guest.nationalId && (
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">
                    {isArabic ? "الهوية:" : "ID:"}
                  </span>
                  <span className="text-gray-700 truncate">
                    {card.guest.nationalId}
                  </span>
                </div>
              )}
              {card.guest.nationality && (
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">
                    {isArabic ? "الجنسية:" : "Nationality:"}
                  </span>
                  <span className="text-gray-700 truncate">
                    {card.guest.nationality}
                  </span>
                </div>
              )}
              {card.guest.company && (
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">
                    {isArabic ? "الشركة:" : "Company:"}
                  </span>
                  <span className="text-gray-700 truncate">
                    {card.guest.company}
                  </span>
                </div>
              )}
              {card.guest.religion && (
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">
                    {isArabic ? "الديانة:" : "Religion:"}
                  </span>
                  <span className="text-gray-700 truncate">
                    {card.guest.religion}
                  </span>
                </div>
              )}
              {card.guest.jobTitle && (
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">
                    {isArabic ? "المنصب:" : "Job Title:"}
                  </span>
                  <span className="text-gray-700 truncate">
                    {card.guest.jobTitle}
                  </span>
                </div>
              )}
              {card.guest.roomNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">
                    {isArabic ? "الغرفة:" : "Room:"}
                  </span>
                  <span className="text-gray-700 truncate">
                    {card.guest.roomNumber}
                  </span>
                </div>
              )}
            </div>

            {/* عرض الوجبات المتعددة */}
            {allowedMealTimes.length > 0 ? (
              <div className="bg-blue-50/80 rounded-lg p-3 space-y-2 w-full">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">
                    {isArabic ? "الوجبات المسموحة:" : "Allowed Meals:"}
                  </span>
                </div>
                <div className="space-y-1">
                  {allowedMealTimes.map((mealTime, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-md px-3 py-2 border border-blue-200"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-blue-700">
                          {mealTime.name}
                        </span>
                        <span className="text-xs text-gray-600 font-mono">
                          {mealTime.startTime} - {mealTime.endTime}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              card.mealTime && (
                <div className="bg-blue-50/80 rounded-lg p-3 w-full">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-700">
                      {Array.isArray(card.mealTime.name)
                        ? card.mealTime.name.join(", ")
                        : card.mealTime.name}
                    </span>
                    <span className="text-xs text-gray-600 font-mono">
                      {card.mealTime.startTime} - {card.mealTime.endTime}
                    </span>
                  </div>
                </div>
              )
            )}

            {/* معلومات الصلاحية والاستخدام */}
            <div className="bg-gray-50/80 rounded-lg p-3 space-y-2 w-full">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-600">
                  {isArabic ? "صالحة:" : "Valid:"}
                </span>
                <span className="text-xs text-gray-700 font-mono">
                  {format(new Date(card.validFrom), "dd/MM/yy")} -{" "}
                  {format(new Date(card.validTo), "dd/MM/yy")}
                </span>
              </div>
           {/* change */}
               {(card.maxUsage || card.usageCount !== undefined) && (
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-600">
                    {isArabic ? "الاستخدام:" : "Usage:"}
                  </span>
                  <span className="text-xs text-gray-700 font-mono">
                    {card.usageCount || 0}
                    {card.maxUsage ? `/${card.maxUsage}` : ""}
                  </span>
                </div>
              )} 
            </div>
          </div>

          {/* QR Code Section */}
          <div className="flex justify-center py-3">
            <div className="text-center bg-white rounded-lg p-4 shadow-sm">
              <QRCodeSVG
                value={card.cardData}
                size={170}
                level="H"
                includeMargin={true}
                marginSize={4}
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
}