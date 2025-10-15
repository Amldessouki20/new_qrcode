'use client';

import React, { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { compressImage, validateImageFile, formatFileSize } from '@/lib/image-utils-client';

interface ImageUploadProps {
  value?: string; // Base64 image data
  onChange: (value: string | null) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  maxSize?: number; // in bytes, default 2MB
  acceptedTypes?: string[]; // default ['image/jpeg', 'image/png', 'image/webp']
  className?: string;
  placeholder?: string;
  showPreview?: boolean;
  compressionQuality?: number; // 0-1, default 0.8
}

export function ImageUpload({
  value,
  onChange,
  onError,
  disabled = false,
  maxSize = 2 * 1024 * 1024, // 2MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  className = '',
  placeholder = 'اسحب الصورة هنا أو انقر للاختيار',
  showPreview = true,
  compressionQuality = 0.8,
}: ImageUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleError = useCallback((error: string, details?: unknown) => {
    console.error('ImageUpload Error:', error, details);
    onError?.(error);
    setIsUploading(false);
    setUploadProgress(0);
  }, [onError]);

  const processFile = useCallback(async (file: File) => {
    console.log('🔄 Starting image processing:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Log file details before validation
      console.log('📋 File validation parameters:', {
        maxSizeInMB: maxSize / (1024 * 1024),
        allowedTypes: acceptedTypes,
        actualFileSize: file.size,
        actualFileType: file.type
      });

      // Validate file
      const validation = await validateImageFile(file, {
        maxSizeInMB: maxSize / (1024 * 1024),
        allowedTypes: acceptedTypes
      });
      
      console.log('✅ Validation result:', validation);
      
      if (!validation.isValid) {
        console.error('❌ File validation failed:', validation.error);
        handleError(validation.error || 'Invalid file', { validation, file: { name: file.name, size: file.size, type: file.type } });
        return;
      }

      setUploadProgress(30);
      console.log('🗜️ Starting image compression...');

      // Compress image
      const compressionResult = await compressImage(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: compressionQuality,
      });

      console.log('✅ Image compressed:', {
        originalSize: file.size,
        compressedSize: compressionResult.blob.size,
        compressionRatio: ((file.size - compressionResult.blob.size) / file.size * 100).toFixed(2) + '%'
      });

      setUploadProgress(60);
      console.log('🔄 Base64 already available from compression...');

      // Use the base64 from compression result
      const base64 = compressionResult.base64;
      
      console.log('✅ Base64 available:', {
        base64Length: base64.length,
        base64Preview: base64.substring(0, 100) + '...'
      });

      setUploadProgress(90);

      // Create preview URL
      const previewUrl = URL.createObjectURL(compressionResult.blob);
      setPreviewUrl(previewUrl);

      console.log('✅ Preview URL created:', previewUrl);

      // Call onChange with data URL to include MIME type
      const dataUrl = `data:${file.type};base64,${base64}`;
      onChange(dataUrl);

      setUploadProgress(100);
      console.log('🎉 Image processing completed successfully');
      
      // Reset progress after a short delay
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);

    } catch (error) {
      console.error('💥 Error processing image:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('File details at error:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      });
      
      // More specific error messages based on error type
      let errorMessage = 'فشل في معالجة الصورة';
      if (error instanceof Error) {
        if (error.message.includes('Failed to read image')) {
          errorMessage = 'فشل في قراءة الصورة. تأكد من أن الملف صورة صحيحة';
        } else if (error.message.includes('compression')) {
          errorMessage = 'فشل في ضغط الصورة. حاول مع صورة أخرى';
        } else if (error.message.includes('base64')) {
          errorMessage = 'فشل في تحويل الصورة. حاول مع صورة أخرى';
        }
      }
      
      handleError(errorMessage, { 
        originalError: error, 
        file: { name: file.name, size: file.size, type: file.type },
        step: 'processing'
      });
    }
  }, [maxSize, acceptedTypes, compressionQuality, onChange, handleError]);

  const handleFileSelect = useCallback((files: FileList | null) => {
    console.log('📁 File selection event:', files ? Array.from(files).map(f => ({ name: f.name, size: f.size, type: f.type })) : 'No files');
    
    if (!files || files.length === 0) {
      console.log('⚠️ No files selected');
      return;
    }
    
    const file = files[0];
    console.log('🎯 Processing selected file:', { name: file.name, size: file.size, type: file.type });
    processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  }, [disabled, handleFileSelect]);

  const handleClick = useCallback(() => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  }, [disabled, isUploading]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [previewUrl, onChange]);

  const acceptString = acceptedTypes.join(',');

  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptString}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        disabled={disabled}
      />
      
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${previewUrl && showPreview ? 'pb-2' : ''}
        `}
      >
        {/* Upload Progress */}
        {isUploading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 rounded-lg flex items-center justify-center z-10">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 relative">
                <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
                <div 
                  className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"
                  style={{
                    background: `conic-gradient(from 0deg, transparent ${uploadProgress * 3.6}deg, #3b82f6 ${uploadProgress * 3.6}deg)`
                  }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                جاري الرفع... {uploadProgress}%
              </p>
            </div>
          </div>
        )}

        {/* Preview Image */}
        {previewUrl && showPreview && !isUploading && (
          <div className="relative mb-4 w-32 h-32 mx-auto">
            <Image
              src={previewUrl}
              alt="Preview"
              fill
              unoptimized
              className="object-cover rounded-lg border border-gray-200 dark:border-gray-700"
              sizes="128px"
            />
            <button
              onClick={handleRemove}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              type="button"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Upload Content */}
        {!previewUrl && (
          <div className="space-y-4">
            <div className="flex justify-center">
              {isDragOver ? (
                <Upload className="w-12 h-12 text-blue-500" />
              ) : (
                <ImageIcon className="w-12 h-12 text-gray-400" />
              )}
            </div>
            
            <div>
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                {placeholder}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                أو انقر لاختيار ملف
              </p>
            </div>

            <div className="text-xs text-gray-400 dark:text-gray-500 space-y-1">
              <p>الأنواع المدعومة: {acceptedTypes.map(type => type.split('/')[1]).join(', ')}</p>
              <p>الحد الأقصى للحجم: {formatFileSize(maxSize)}</p>
            </div>
          </div>
        )}

        {/* File Info for Preview */}
        {previewUrl && showPreview && !isUploading && (
          <div className="text-center">
            {/* <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              تم رفع الصورة بنجاح
            </p> */}
            <button
              onClick={handleClick}
              className="text-sm text-blue-500 hover:text-blue-600 underline"
              type="button"
            >
              تغيير الصورة
            </button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {/* This would typically be handled by the parent component */}
    </div>
  );
}

// Additional utility component for displaying upload errors
export function ImageUploadError({ error, onDismiss }: { error: string; onDismiss?: () => void }) {
  return (
    <div className="mt-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md flex items-start space-x-2 rtl:space-x-reverse">
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}