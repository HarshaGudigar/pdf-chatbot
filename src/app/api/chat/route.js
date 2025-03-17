import { NextResponse } from 'next/server';

const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant that answers questions based on the provided PDF content.
Use only the information from the PDF to answer the question.
If the answer cannot be found in the PDF content, say so clearly.`;

const DEFAULT_PARAMETERS = {
  temperature: 0.7,
  top_p: 0.9,
  max_tokens: 2000,
  presence_penalty: 0,
  frequency_penalty: 0
};

export async function POST(request) {
  try {
    const { 
      pdfContent, 
      query, 
      model = 'llama2', 
      systemPrompt,
      parameters = {}
    } = await request.json();
    
    if (!pdfContent || !query) {
      return NextResponse.json(
        { error: 'Missing required fields: pdfContent and query' },
        { status: 400 }
      );
    }

    // Use the provided system prompt or fall back to the default
    const finalSystemPrompt = systemPrompt || DEFAULT_SYSTEM_PROMPT;
    
    // Merge default parameters with provided parameters
    const finalParameters = {
      ...DEFAULT_PARAMETERS,
      ...parameters
    };
    
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

    try {
      // Call Ollama API with streaming enabled
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          stream: true,
          options: {
            temperature: finalParameters.temperature,
            top_p: finalParameters.top_p,
            num_predict: finalParameters.max_tokens,
            presence_penalty: finalParameters.presence_penalty,
            frequency_penalty: finalParameters.frequency_penalty
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Ollama API error (${response.status}):`, errorText);
        
        // If Ollama is not running or the model doesn't exist, provide a helpful error
        if (response.status === 404) {
          return NextResponse.json(
            { error: `Model '${model}' not found. Please make sure it's installed in Ollama.` },
            { status: 404 }
          );
        } else if (response.status === 500) {
          return NextResponse.json(
            { error: 'Ollama server error. Please check that Ollama is running correctly.' },
            { status: 500 }
          );
        } else if (response.status === 0 || response.status === 502 || response.status === 503) {
          return NextResponse.json(
            { error: 'Cannot connect to Ollama. Please make sure Ollama is running.' },
            { status: 502 }
          );
        }
        
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      // Create a TransformStream to process the streaming response
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      const transformStream = new TransformStream({
        async transform(chunk, controller) {
          try {
            // Parse the chunk as JSON
            const text = decoder.decode(chunk);
            
            // Ollama sends each chunk as a separate JSON object
            // Each line is a separate JSON object
            const lines = text.split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
              try {
                const data = JSON.parse(line);
                
                // Send only the content part of the message
                if (data.message?.content) {
                  controller.enqueue(encoder.encode(data.message.content));
                }
                
                // If done is true, we've reached the end of the stream
                if (data.done) {
                  controller.terminate();
                }
              } catch (e) {
                console.error('Error parsing streaming response line:', e, 'Line:', line);
              }
            }
          } catch (e) {
            console.error('Error in transform stream:', e);
            controller.error(e);
          }
        }
      });

      // Create a ReadableStream from the fetch response
      const stream = response.body
        .pipeThrough(transformStream);
      
      // Return the stream as a Response
      return new Response(stream);
    } catch (ollamaError) {
      console.error('Error calling Ollama API:', ollamaError);
      
      // Provide a fallback response for common connection issues
      if (ollamaError.code === 'ECONNREFUSED' || ollamaError.message.includes('fetch failed')) {
        // Create a simple fallback response
        const fallbackResponse = `I'm unable to connect to the Ollama service to process your question about the PDF. 

Here are some things you can try:

1. Make sure Ollama is installed and running on your system
2. Check that the model "${model}" is available in your Ollama installation
3. Try refreshing the page and asking your question again
4. If the problem persists, try using a different model in the settings panel

Your question was: "${query}"

If you need immediate assistance with this PDF, you might want to try reading it directly.`;

        // Return a JSON error for API clients, but include the fallback response
        return NextResponse.json(
          { 
            error: 'Cannot connect to Ollama. Please make sure Ollama is running on your system.',
            fallbackResponse: fallbackResponse
          },
          { status: 502 }
        );
      }
      
      throw ollamaError;
    }
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get response from Ollama' },
      { status: 500 }
    );
  }
} 