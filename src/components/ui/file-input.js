"use client"

import React, { useState } from 'react';
import { Button } from './button';
import { cn } from '@/lib/utils';

const FileInput = ({ className, onFileChange, accept = '.pdf', ...props }) => {
  const [fileName, setFileName] = useState('');
  const fileInputRef = React.useRef(null);

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

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        <Button 
          type="button" 
          onClick={handleButtonClick}
          variant="outline"
        >
          Choose PDF
        </Button>
        <span className="text-sm text-muted-foreground truncate max-w-[200px]">
          {fileName || 'No file selected'}
        </span>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept={accept}
        {...props}
      />
    </div>
  );
};

export { FileInput }; 