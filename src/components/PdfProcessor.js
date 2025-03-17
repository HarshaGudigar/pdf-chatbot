"use client"

import { useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker
export function initPdfWorker() {
  if (typeof window !== 'undefined') {
    // Use a direct import from unpkg (more reliable than cdnjs)
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
  }
}

// Component to initialize PDF.js
export default function PdfProcessor() {
  useEffect(() => {
    initPdfWorker();
  }, []);
  
  return null; // This component doesn't render anything
} 