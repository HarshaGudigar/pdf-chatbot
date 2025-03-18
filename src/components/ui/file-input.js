"use client"

import React, { useState, useRef } from 'react';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { Upload, File } from 'lucide-react';

const FileInput = ({ className, onFileChange, accept = '.pdf', disabled = false, ...props }) => {
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      if (onFileChange) {
        onFileChange(file);
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current.click();
  };
  
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
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
    if (!disabled) {
      setIsDragging(true);
    }
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files.length) {
      const file = files[0];
      // Check if the file is a PDF
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setFileName(file.name);
        if (onFileChange) {
          onFileChange(file);
        }
      } else {
        // Alert the user if the file is not a PDF
        alert('Please upload a PDF file');
      }
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div 
        className={cn(
          "border-2 border-dashed rounded-lg p-4 transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          "flex flex-col items-center justify-center gap-2"
        )}
        onClick={!disabled ? handleButtonClick : undefined}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center text-center">
          <Upload className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">
            {fileName ? (
              <>
                <File className="h-4 w-4 inline mr-1" />
                {fileName}
              </>
            ) : (
              <>
                <span className="font-semibold">Click to upload</span> or drag and drop
              </>
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
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
        disabled={disabled}
        {...props}
      />
    </div>
  );
};

export { FileInput }; 