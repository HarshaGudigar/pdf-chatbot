"use client"

/**
 * Extracts text content from a PDF file using the server-side API
 * @param {File} file - The PDF file to process
 * @returns {Promise<string>} - The extracted text content
 */
export async function extractTextFromPDF(file) {
  try {
    // Extract basic file information
    const fileInfo = {
      name: file.name,
      size: (file.size / 1024).toFixed(2) + ' KB',
      type: file.type,
      lastModified: new Date(file.lastModified).toLocaleString()
    };
    
    // Create a FormData object to send the file
    const formData = new FormData();
    formData.append('file', file);
    
    // Send the file to the server for processing
    const response = await fetch('/api/pdf', {
      method: 'POST',
      body: formData,
    });
    
    // Check if the response is OK
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error:', errorText);
      
      // Try to extract more helpful error info if possible
      let errorMessage = `Server returned ${response.status}: ${response.statusText}`;
      try {
        // Try to parse the error as JSON if possible
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          errorMessage = errorJson.error;
        }
        if (errorJson.message) {
          errorMessage += ` - ${errorJson.message}`;
        }
      } catch (e) {
        // If we can't parse as JSON, use a substring of the error text
        if (errorText && errorText.length > 0) {
          const maxLength = Math.min(200, errorText.length);
          errorMessage += ` - ${errorText.substring(0, maxLength)}...`;
        }
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    // Check if the server returned an error with fallback text
    if (data.error && data.fallbackText) {
      console.warn('PDF extraction error with fallback:', data.error);
      return `PDF EXTRACTION ISSUE
File: ${fileInfo.name}
Size: ${fileInfo.size}
Type: ${fileInfo.type}
Last Modified: ${fileInfo.lastModified}

${data.fallbackText}`;
    }
    
    // Return the extracted text
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    
    // Return basic file information if text extraction fails
    return `PDF EXTRACTION FAILED
File: ${file.name}
Size: ${(file.size / 1024).toFixed(2)} KB
Type: ${file.type}
Last Modified: ${new Date(file.lastModified).toLocaleString()}

Error details: ${error.message}

The server was unable to extract the content from this PDF. This might be due to:
- PDF file restrictions or password protection
- Corrupted PDF file structure
- PDF containing primarily images or scanned content
- Internal server error processing the PDF

You can still ask questions, but responses will be limited to the basic file information shown above.`;
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