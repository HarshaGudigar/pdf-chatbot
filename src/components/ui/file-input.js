"use client"

import React, { useState, useRef } from 'react';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { Upload, File, Loader2 } from 'lucide-react';

const FileInput = ({ 
  className, 
  onFileChange, 
  onChange,  // Add support for alternative prop name
  accept = '.pdf', 
  disabled = false, 
  isLoading = false, 
  ...props 
}) => {
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Use either onFileChange or onChange (for compatibility)
  const handleFile = (file) => {
    if (onFileChange) {
      onFileChange(file);
    } else if (onChange) {
      onChange(file);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      handleFile(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current.click();
  };
  
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isLoading) {
      setIsDragging(true);
    }
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isLoading) {
      setIsDragging(true);
    }
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (disabled || isLoading) return;
    
    const files = e.dataTransfer.files;
    if (files.length) {
      const file = files[0];
      // Check if the file is a PDF
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setFileName(file.name);
        handleFile(file);
      } else {
        // Alert the user if the file is not a PDF
        alert('Please upload a PDF file');
      }
    }
  };

  // Determine if the component should be disabled
  const isDisabled = disabled || isLoading;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div 
        className={cn(
          "border-2 border-dashed rounded-lg p-6 transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50",
          isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          "flex flex-col items-center justify-center gap-3"
        )}
        onClick={!isDisabled ? handleButtonClick : undefined}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center text-center">
          {isLoading ? (
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-3" />
          ) : (
            <Upload className="h-12 w-12 text-primary/70 mb-3" />
          )}
          <p className="text-base font-medium mb-1">
            {fileName ? (
              <>
                <File className="h-4 w-4 inline mr-1" />
                {fileName}
              </>
            ) : (
              <>
                <span className="font-semibold">
                  {isLoading ? 'Processing PDF...' : 'Click to upload'}
                </span>
                {!isLoading && ' or drag and drop'}
              </>
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            PDF files only
          </p>
        </div>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept={accept}
        disabled={isDisabled}
        {...props}
      />
    </div>
  );
};

export { FileInput }; 