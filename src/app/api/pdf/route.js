import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import PDFParser from 'pdf2json';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Create output directory if it doesn't exist
const ensureOutputDir = async () => {
  const outputDir = path.join(process.cwd(), 'public', 'extracted');
  try {
    await mkdir(outputDir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      console.error('Error creating output directory:', error);
    }
  }
  return outputDir;
};

// Generate HTML from extracted text
const generateHtml = (filename, text, metadata) => {
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Extracted PDF: ${filename}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
    }
    .metadata {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .page {
      margin-bottom: 30px;
      border: 1px solid #ddd;
      padding: 15px;
      border-radius: 5px;
    }
    .page-header {
      background-color: #eee;
      padding: 5px 10px;
      margin: -15px -15px 15px -15px;
      border-top-left-radius: 5px;
      border-top-right-radius: 5px;
      font-weight: bold;
    }
    pre {
      white-space: pre-wrap;
      word-wrap: break-word;
    }
  </style>
</head>
<body>
  <h1>Extracted PDF Content: ${filename}</h1>
  <div class="metadata">
    <p><strong>File:</strong> ${filename}</p>
    <p><strong>Pages:</strong> ${metadata.pageCount}</p>
    <p><strong>Size:</strong> ${metadata.fileSize} KB</p>
    <p><strong>Type:</strong> ${metadata.fileType}</p>
    <p><strong>Extraction Method:</strong> ${metadata.extractMethod}</p>
    <p><strong>Extracted On:</strong> ${new Date().toLocaleString()}</p>
  </div>
  <div class="content">
    ${text
      .split('[Page ')
      .filter(part => part.trim())
      .map(part => {
        const pageNumber = part.split(']')[0];
        const pageContent = part.split(']').slice(1).join(']').trim();
        return `<div class="page">
          <div class="page-header">Page ${pageNumber}</div>
          <pre>${pageContent}</pre>
        </div>`;
      })
      .join('')}
  </div>
</body>
</html>`;

  return htmlContent;
};

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Get file info
    const fileInfo = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    };
    
    try {
      // Convert the file to an ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Check PDF magic number (%PDF-)
      const isPdfFile = buffer.length > 4 && 
                        buffer[0] === 0x25 && // %
                        buffer[1] === 0x50 && // P
                        buffer[2] === 0x44 && // D
                        buffer[3] === 0x46 && // F
                        buffer[4] === 0x2D;   // -
      
      if (!isPdfFile) {
        return NextResponse.json(
          { 
            error: 'Invalid PDF format', 
            message: 'The file does not appear to be a valid PDF document',
            fallbackText: `The file "${file.name}" does not appear to be a valid PDF document.
Please check the file and try again with a valid PDF file.`
          }, 
          { status: 422 }
        );
      }
      
      let text = '';
      let extractMethod = 'unknown';
      let pageCount = 0;
      let metadata = {};
      
      // First validate PDF with pdf-lib
      try {
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        pageCount = pdfDoc.getPageCount();
        extractMethod = 'pdf-lib-validation';
        
        // Extract text using pdf2json
        try {
          const pdfParser = new PDFParser(null, 1);
          
          const pdfData = await new Promise((resolve, reject) => {
            pdfParser.on("pdfParser_dataReady", (pdfData) => {
              resolve(pdfData);
            });
            
            pdfParser.on("pdfParser_dataError", (error) => {
              reject(error);
            });
            
            pdfParser.parseBuffer(buffer);
          });
          
          // Process the extracted pages into text
          const pages = pdfData.Pages || [];
          pageCount = pages.length;
          
          // Extract text from all pages
          const extractedText = pages.map((page, i) => {
            const pageNum = i + 1;
            let pageText = '';
            
            // Process each text element on the page
            if (page.Texts) {
              pageText = page.Texts.map(text => {
                return decodeURIComponent(text.R.map(r => r.T).join(' '));
              }).join(' ');
            }
            
            return `[Page ${pageNum}]\n${pageText}`;
          });
          
          text = extractedText.join('\n\n');
          metadata = {
            pageCount: pageCount,
            info: pdfData.Meta || {},
          };
          extractMethod = 'pdf2json';
        } catch (parseError) {
          console.warn('Text extraction failed:', parseError);
          text = `[Unable to extract text content from this PDF. The document structure was recognized (${pageCount} pages), but text extraction failed.]`;
          metadata = { pageCount };
          extractMethod = 'pdf-lib-metadata-only';
        }
      } catch (pdfError) {
        console.error('PDF validation failed:', pdfError);
        
        // Return error with specific message
        return NextResponse.json(
          { 
            error: 'Invalid PDF document', 
            message: pdfError.message,
            fallbackText: `The file "${file.name}" could not be processed as a valid PDF document.
This might be due to file corruption, encryption, or incompatible PDF features.`
          }, 
          { status: 422 }
        );
      }
      
      // Prepare the final content summary
      const contentSummary = `PDF File: ${file.name}
Page count: ${pageCount} pages
Size: ${(file.size / 1024).toFixed(2)} KB
Type: ${file.type}
Last Modified: ${new Date(file.lastModified).toLocaleString()}

${text}`;

      // Generate a unique filename for the extracted HTML
      const uniqueId = uuidv4().slice(0, 8);
      const safeFilename = file.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
      const htmlFilename = `${safeFilename}_${uniqueId}.html`;
      
      // Ensure output directory exists
      const outputDir = await ensureOutputDir();
      const htmlFilePath = path.join(outputDir, htmlFilename);
      
      // Create metadata for HTML generation
      const htmlMetadata = {
        pageCount,
        fileSize: (file.size / 1024).toFixed(2),
        fileType: file.type,
        extractMethod
      };
      
      // Generate and save HTML file
      const htmlContent = generateHtml(file.name, text, htmlMetadata);
      await writeFile(htmlFilePath, htmlContent);
      
      // Create public URL for the HTML file
      const htmlUrl = `/extracted/${htmlFilename}`;
      
      // Return the extracted text, metadata, and HTML URL
      return NextResponse.json({
        text: contentSummary,
        metadata,
        fileInfo,
        extractMethod,
        htmlUrl
      });
    } catch (error) {
      console.error('PDF processing error:', error);
      
      return NextResponse.json(
        { 
          error: 'Failed to process PDF', 
          message: error.message,
          fallbackText: `The server encountered an error while processing the PDF file "${file.name}".
We were unable to extract any content from this file.
Error details: ${error.message}`
        }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process request', 
        message: error.message,
        fallbackText: 'The server was unable to process this request. Please try again with a different PDF file.'
      }, 
      { status: 500 }
    );
  }
} 