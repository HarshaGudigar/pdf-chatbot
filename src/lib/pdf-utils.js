"use client"

/**
 * Extracts text content from a PDF file using the server-side API
 * @param {File} file - The PDF file to process
 * @returns {Promise<string>} - The extracted text content
 */
export async function extractTextFromPDF(file) {
  try {
    // Get basic file information
    const fileInfo = {
      name: file.name,
      size: (file.size / 1024).toFixed(2) + ' KB',
      type: file.type,
      lastModified: new Date(file.lastModified).toLocaleString()
    };
    
    // Try to use the server-side API for PDF processing
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      
      const response = await fetch('/api/pdf', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      // Check if we have an error but also a fallback text
      if (data.error && data.fallbackText) {
        return `PDF CONTENT FROM: ${fileInfo.name}\n\n${data.fallbackText}`;
      }
      
      // Check if we have text from the server
      if (data.text && data.text.trim().length > 0) {
        return `PDF CONTENT FROM: ${fileInfo.name}\n\n${data.text}`;
      }
      
      // If we got an empty response, fall back to the client-side approach
      throw new Error('Server returned empty text content');
    } catch (serverError) {
      console.error('Server-side PDF processing failed:', serverError);
      
      // Fall back to client-side approach (metadata only)
      const pdfInfo = `
PDF FILE INFORMATION:
Filename: ${fileInfo.name}
Size: ${fileInfo.size}
Type: ${fileInfo.type}
Last Modified: ${fileInfo.lastModified}

CONTENT SUMMARY:
This is a PDF file that was uploaded for analysis. The server was unable to extract the content of this PDF. However, you can still ask questions about this PDF, and I'll do my best to help based on the information you provide.

INSTRUCTIONS FOR USERS:
1. When asking questions about this PDF, please provide context about what the PDF contains
2. Be specific with your questions to get the most helpful responses
3. If you need the actual content analyzed, consider using a desktop PDF reader

NOTE: This is a simplified representation of the PDF file. The actual content could not be extracted by the server.
`;
      
      return pdfInfo;
    }
  } catch (error) {
    console.error('Error processing PDF:', error);
    
    // Return a fallback message if processing fails
    return `Failed to process ${file.name}. Error: ${error.message}
    
    Please try uploading a different file.`;
  }
}

/**
 * Splits the text into chunks for processing
 * @param {string} text - The text to split
 * @param {number} chunkSize - The maximum size of each chunk
 * @returns {Array<string>} - Array of text chunks
 */
export function splitTextIntoChunks(text, chunkSize = 1000) {
  const chunks = [];
  let currentChunk = '';
  
  // Split by paragraphs first
  const paragraphs = text.split('\n\n');
  
  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed the chunk size, save the current chunk and start a new one
    if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    
    currentChunk += paragraph + '\n\n';
  }
  
  // Add the last chunk if it's not empty
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
} 