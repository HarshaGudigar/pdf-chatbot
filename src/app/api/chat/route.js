import { NextResponse } from 'next/server';
import { generateResponse } from '@/lib/ollama-utils';

export async function POST(request) {
  try {
    const { pdfContent, query, model } = await request.json();
    
    if (!pdfContent || !query) {
      return NextResponse.json(
        { error: 'PDF content and query are required' },
        { status: 400 }
      );
    }
    
    // Generate response using Ollama
    const response = await generateResponse(pdfContent, query, model || 'llama3');
    
    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error.message },
      { status: 500 }
    );
  }
} 