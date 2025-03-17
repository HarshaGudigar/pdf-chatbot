import { NextResponse } from 'next/server';

// Default models to return if Ollama API is not available
const FALLBACK_MODELS = [
  'llama2',
  'mistral',
  'gemma',
  'phi',
  'codellama',
  'llama3',
  'orca-mini'
];

export async function GET() {
  try {
    // Try to fetch models from Ollama API
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Set a timeout to avoid hanging if Ollama is not running
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract model names from Ollama response
    // Ollama API returns { models: [{name: "model1", ...}, ...] }
    const models = data.models ? data.models.map(model => model.name) : [];
    
    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error fetching Ollama models:', error);
    
    // Return fallback models if Ollama API is not available
    return NextResponse.json({ 
      models: FALLBACK_MODELS,
      fallback: true,
      error: error.message 
    });
  }
} 