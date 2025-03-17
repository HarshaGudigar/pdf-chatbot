import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch models from Ollama
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch models from Ollama' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Format the response to match what our frontend expects
    // Ollama API returns { models: [{name: "model1", ...}, ...] }
    if (!data.models) {
      // If the response doesn't have the expected format, create a compatible structure
      const formattedData = {
        models: Array.isArray(data) 
          ? data.map(model => ({ name: model })) 
          : [{ name: 'llama2' }] // Fallback to llama2 if no models found
      };
      return NextResponse.json(formattedData);
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching models:', error);
    // Return a fallback response with a default model
    return NextResponse.json(
      { models: [{ name: 'llama2' }] },
      { status: 200 }
    );
  }
} 