import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

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
    // First try to use the ollama CLI command
    try {
      const { stdout } = await execPromise('ollama list', { timeout: 5000 });
      
      // Parse the output to extract model names
      // The output format is typically:
      // NAME            ID              SIZE    MODIFIED
      // llama2:latest   ...             ...     ...
      // mistral:latest  ...             ...     ...
      
      const lines = stdout.trim().split('\n');
      
      // Skip the header line
      if (lines.length > 1) {
        const modelLines = lines.slice(1);
        const models = modelLines.map(line => {
          // Extract the model name (first column)
          const modelName = line.trim().split(/\s+/)[0];
          // Remove the ":latest" suffix if present
          return modelName.replace(/:latest$/, '');
        });
        
        return NextResponse.json({ models });
      }
      
      // If we got output but couldn't parse models, fall back to API
      console.log('Could not parse models from ollama list output, falling back to API');
    } catch (cliError) {
      console.log('Error using ollama CLI:', cliError.message);
      // Continue to the API fallback
    }
    
    // If CLI approach fails, try the API
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