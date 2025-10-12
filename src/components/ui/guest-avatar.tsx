'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuestAvatarProps {
  src?: string | null;
  alt?: string;
  fallbackText?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  loading?: boolean;
  onClick?: () => void;
  showBorder?: boolean;
  borderColor?: string;
  style?: React.CSSProperties;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-20 h-20 text-2xl',
};

const iconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
};

export function GuestAvatar({
  src,
  alt,
  fallbackText,
  size = 'md',
  className,
  loading = false,
  onClick,
  showBorder = false,
  borderColor = 'border-gray-200 dark:border-gray-700',
  style,
}: GuestAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Generate initials from fallbackText
  const initials = useMemo(() => {
    if (!fallbackText) return '';
    
    const words = fallbackText.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    
    return words
      .slice(0, 2)
      .map(word => word.charAt(0).toUpperCase())
      .join('');
  }, [fallbackText]);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  const shouldShowImage = src && !imageError && !loading;
  const shouldShowLoading = loading || (src && imageLoading && !imageError);

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0',
        sizeClasses[size],
        showBorder && `border-2 ${borderColor}`,
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      onClick={onClick}
      style={style}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {/* Loading State */}
      {shouldShowLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <Loader2 
            size={iconSizes[size] * 0.6} 
            className="animate-spin text-gray-400 dark:text-gray-500" 
          />
        </div>
      )}

      {/* Image */}
      {shouldShowImage && (
        <Image
          src={src!}
          alt={alt || fallbackText || 'Guest Avatar'}
          fill
          className="object-cover"
          onLoad={handleImageLoad}
          onError={handleImageError}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      )}

      {/* Fallback Content */}
      {!shouldShowImage && !shouldShowLoading && (
        <div className="flex items-center justify-center w-full h-full">
          {initials ? (
            <span className="font-medium text-gray-600 dark:text-gray-300 select-none">
              {initials}
            </span>
          ) : (
            <User 
              size={iconSizes[size] * 0.6} 
              className="text-gray-400 dark:text-gray-500" 
            />
          )}
        </div>
      )}
    </div>
  );
}

// Guest Avatar Group Component for displaying multiple guest avatars
interface GuestAvatarGroupProps {
  guests: Array<{
    src?: string | null;
    alt?: string;
    fallbackText?: string;
  }>;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  max?: number;
  className?: string;
  showBorder?: boolean;
  borderColor?: string;
  spacing?: 'tight' | 'normal' | 'loose';
}

const spacingClasses = {
  tight: '-space-x-1 rtl:space-x-reverse',
  normal: '-space-x-2 rtl:space-x-reverse',
  loose: '-space-x-3 rtl:space-x-reverse',
};

export function GuestAvatarGroup({
  guests,
  size = 'md',
  max = 3,
  className,
  showBorder = true,
  borderColor = 'border-white dark:border-gray-900',
  spacing = 'normal',
}: GuestAvatarGroupProps) {
  const displayGuests = guests.slice(0, max);
  const remainingCount = Math.max(0, guests.length - max);

  return (
    <div className={cn('flex items-center', spacingClasses[spacing], className)}>
      {displayGuests.map((guest, index) => (
        <GuestAvatar
          key={index}
          src={guest.src}
          alt={guest.alt}
          fallbackText={guest.fallbackText}
          size={size}
          showBorder={showBorder}
          borderColor={borderColor}
          className="relative z-10"
          style={{ zIndex: displayGuests.length - index }}
        />
      ))}
      
      {remainingCount > 0 && (
        <div
          className={cn(
            'relative inline-flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium',
            sizeClasses[size],
            showBorder && `border-2 ${borderColor}`,
          )}
          style={{ zIndex: 0 }}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

// Guest Avatar with Status Badge
interface GuestAvatarWithBadgeProps extends GuestAvatarProps {
  badgeContent?: React.ReactNode;
  badgeColor?: 'green' | 'red' | 'yellow' | 'blue' | 'gray';
  badgePosition?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  isActive?: boolean;
}

const badgeColors = {
  green: 'bg-green-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  blue: 'bg-blue-500',
  gray: 'bg-gray-500',
};

const badgePositions = {
  'top-right': 'top-0 right-0',
  'bottom-right': 'bottom-0 right-0',
  'top-left': 'top-0 left-0',
  'bottom-left': 'bottom-0 left-0',
};

export function GuestAvatarWithBadge({
  badgeContent,
  badgeColor = 'green',
  badgePosition = 'top-right',
  isActive = true,
  ...avatarProps
}: GuestAvatarWithBadgeProps) {
  const defaultBadgeColor = isActive ? 'green' : 'gray';
  const finalBadgeColor = badgeContent ? badgeColor : defaultBadgeColor;

  return (
    <div className="relative inline-block">
      <GuestAvatar {...avatarProps} />
      <div
        className={cn(
          'absolute w-3 h-3 rounded-full border-2 border-white dark:border-gray-900',
          badgeColors[finalBadgeColor],
          badgePositions[badgePosition],
        )}
        title={isActive ? 'نشط' : 'غير نشط'}
      >
        {typeof badgeContent === 'string' || typeof badgeContent === 'number' ? (
          <span className="sr-only">{badgeContent}</span>
        ) : (
          badgeContent
        )}
      </div>
    </div>
  );
}