import { ChatOllama } from '@langchain/ollama';

/**
 * Creates a new Ollama chat instance
 * @param {string} model - The model to use (default: 'llama2')
 * @returns {ChatOllama} - The Ollama chat instance
 */
export function createOllamaChat(model = 'llama2') {
  return new ChatOllama({
    baseUrl: 'http://localhost:11434', // Default Ollama URL
    model: model,
    temperature: 0.7,
  });
}

/**
 * Generates a response from the Ollama model based on the PDF content and user query
 * @param {string} pdfContent - The content extracted from the PDF
 * @param {string} userQuery - The user's question
 * @param {string} model - The model to use
 * @returns {Promise<string>} - The generated response
 */
export async function generateResponse(pdfContent, userQuery, model = 'llama2') {
  try {
    const chat = createOllamaChat(model);
    
    // Check if the PDF content contains our fallback message
    const isLimitedPdfInfo = pdfContent.includes('CONTENT SUMMARY:') && 
                             pdfContent.includes('The actual content of the PDF could not be extracted');
    
    // Create a system prompt that instructs the model to use the PDF content
    const systemPrompt = isLimitedPdfInfo 
      ? `You are a helpful assistant that helps users with their PDF files. 
      
      The user has uploaded a PDF file, but due to browser limitations, we could only extract basic information about the file, not its actual content.
      
      Here's what we know about the PDF:
      ${pdfContent}
      
      When responding to the user:
      1. Be honest about the limitations - you don't have access to the actual content of the PDF
      2. Try to be helpful based on the user's questions and any context they provide
      3. If they ask about specific content in the PDF that you can't access, politely explain the limitation
      4. Suggest that they provide more context about the PDF content in their questions
      
      Remember: You cannot see the actual content of the PDF, only the basic file information shown above.`
      
      : `You are a helpful assistant that answers questions based on the provided PDF content below.
      
      IMPORTANT: You must ONLY use the information from the PDF content to answer questions. 
      Do NOT say you don't have access to the PDF or that you're a language model.
      If the answer cannot be found in the PDF content, say "I couldn't find information about that in the PDF."
      
      PDF CONTENT:
      ${pdfContent}
      
      Remember: Always answer as if you have full knowledge of the PDF content above. The user has uploaded this PDF and expects you to answer questions about it.`;
    
    // Generate the response
    const response = await chat.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userQuery }
    ]);
    
    return response.content;
  } catch (error) {
    console.error('Error generating response:', error);
    throw new Error('Failed to generate response from Ollama');
  }
} 