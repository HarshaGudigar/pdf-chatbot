import { NextResponse } from 'next/server';

const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant that answers questions based on the provided PDF content.
Use only the information from the PDF to answer the question.
If the answer cannot be found in the PDF content, say so clearly.`;

export async function POST(request) {
  try {
    const { pdfContent, query, model = 'llama2', systemPrompt } = await request.json();
    
    if (!pdfContent || !query) {
      return NextResponse.json(
        { error: 'Missing required fields: pdfContent and query' },
        { status: 400 }
      );
    }

    // Use the provided system prompt or fall back to the default
    const finalSystemPrompt = systemPrompt || DEFAULT_SYSTEM_PROMPT;
    
    // Prepare the prompt with context
    const messages = [
      {
        role: 'system',
        content: finalSystemPrompt
      },
      {
        role: 'user',
        content: `PDF Content: ${pdfContent}\n\nQuestion: ${query}`
      }
    ];

    // Call Ollama API
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({ response: data.message.content });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get response from Ollama' },
      { status: 500 }
    );
  }
} 