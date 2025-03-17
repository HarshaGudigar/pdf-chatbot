"use client"

import React, { useState, useRef, useEffect } from 'react';
import { FileInput } from './ui/file-input';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { extractTextFromPDF } from '@/lib/pdf-utils';
import { toast } from 'sonner';
import AdvancedSettings from './AdvancedSettings';

const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant that answers questions based on the provided PDF content.
Use only the information from the PDF to answer the question.
If the answer cannot be found in the PDF content, say so clearly.`;

const ChatInterface = () => {
  const [pdfContent, setPdfContent] = useState('');
  const [pdfName, setPdfName] = useState('');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama2');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [modelParameters, setModelParameters] = useState({
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 2000,
    presence_penalty: 0,
    frequency_penalty: 0
  });
  const [isFullContent, setIsFullContent] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Handle file upload
  const handleFileChange = async (file) => {
    try {
      // Only accept PDF files
      if (file.type !== 'application/pdf') {
        toast.error('Please upload a PDF file');
        return;
      }
      
      setIsPdfLoading(true);
      setPdfName(file.name);
      
      // Add a system message to indicate PDF processing
      setMessages([{ 
        role: 'system', 
        content: `Processing PDF: ${file.name}. Please wait...` 
      }]);
      
      // Extract text from PDF
      const text = await extractTextFromPDF(file);
      setPdfContent(text);
      
      // Check if we got full content or just metadata
      const isFullPdfContent = !text.includes('CONTENT SUMMARY:') || 
                              !text.includes('The server was unable to extract the content');
      
      setIsFullContent(isFullPdfContent);
      
      // Update the system message to indicate success
      if (isFullPdfContent) {
        setMessages([
          { 
            role: 'system', 
            content: `PDF processed successfully: ${file.name}. Full content extracted.` 
          },
          {
            role: 'assistant',
            content: `I've successfully extracted the content from your PDF file: ${file.name}.

I can now answer questions based on the actual content of this PDF. What would you like to know?`
          }
        ]);
        
        toast.success('PDF content extracted successfully');
      } else {
        setMessages([
          { 
            role: 'system', 
            content: `PDF processed: ${file.name}. Only basic information available.` 
          },
          {
            role: 'assistant',
            content: `I've processed your PDF file: ${file.name}.

I was only able to extract basic information about this PDF, not its full content. 

To get the most helpful responses:
1. When asking questions, please provide context about what the PDF contains
2. Be specific with your questions
3. If you need detailed analysis of the PDF content, consider using a desktop PDF reader

What would you like to know about this PDF?`
          }
        ]);
        
        toast.success('PDF uploaded successfully (basic info only)');
      }
      
      setIsPdfLoading(false);
    } catch (error) {
      console.error('Error processing PDF:', error);
      toast.error('Failed to process PDF');
      setMessages([{ 
        role: 'system', 
        content: `Error processing PDF: ${error.message}` 
      }]);
      setIsPdfLoading(false);
    }
  };

  // Handle model selection
  const handleModelSelect = (modelName) => {
    setSelectedModel(modelName);
  };

  // Handle system prompt change
  const handleSystemPromptChange = (prompt) => {
    setSystemPrompt(prompt);
  };

  // Handle model parameters change
  const handleParametersChange = (params) => {
    setModelParameters(params);
  };

  // Cancel ongoing streaming response
  const cancelStreamingResponse = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setIsGenerating(false);
      
      // Add the partial response to messages
      if (streamingResponse) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: streamingResponse + "\n\n[Response interrupted]" 
        }]);
        setStreamingResponse('');
      }
    }
  };

  // Handle sending a message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    if (!pdfContent) {
      toast.error('Please upload a PDF first');
      return;
    }
    
    // Add user message to chat
    const userMessage = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMessage]);
    
    // Clear input and reset streaming response
    setQuery('');
    setStreamingResponse('');
    setIsLoading(true);
    setIsGenerating(true);
    
    // Create a new AbortController for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    try {
      // Call API to get response
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfContent,
          query: userMessage.content,
          model: selectedModel,
          systemPrompt: systemPrompt,
          parameters: modelParameters
        }),
        signal
      });
      
      // Check for non-streaming error responses
      if (response.headers.get('content-type')?.includes('application/json')) {
        try {
          // Try to parse as JSON to see if it's an error response
          const clonedResponse = response.clone();
          const jsonData = await clonedResponse.json();
          
          // If we have a fallback response, use it
          if (jsonData.fallbackResponse) {
            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: jsonData.fallbackResponse 
            }]);
            setIsLoading(false);
            setIsGenerating(false);
            return;
          }
          
          // Special handling for model not found errors
          if (jsonData.error && jsonData.error.includes("Model") && jsonData.error.includes("not found")) {
            const modelName = jsonData.error.match(/'([^']+)'/)?.[1] || selectedModel;
            const helpfulMessage = `The model "${modelName}" is not installed in your Ollama instance.

Here's how to install it:
1. Open a terminal or command prompt
2. Run: \`ollama pull ${modelName}\`
3. Wait for the download to complete
4. Try your question again

Alternatively, you can select a different model from the Settings panel in the top-right corner.`;

            setMessages(prev => [...prev, { 
              role: 'system', 
              content: helpfulMessage
            }]);
            setIsLoading(false);
            setIsGenerating(false);
            return;
          }
          
          // If we have an error but no fallback, show the error
          if (jsonData.error && !response.ok) {
            throw new Error(jsonData.error);
          }
        } catch (jsonError) {
          // If we can't parse as JSON or there's no error/fallback, continue with streaming
          console.log('Not a JSON error response, continuing with stream handling');
        }
      }
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('API error response:', errorData);
        throw new Error(`Failed to get response: ${response.status} ${response.statusText}`);
      }
      
      if (!response.body) {
        throw new Error('Response body is null or undefined');
      }
      
      // Process the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedResponse = '';
      
      while (!done) {
        try {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          
          if (done) {
            // Add the complete response to messages
            if (accumulatedResponse) {
              setMessages(prev => [...prev, { role: 'assistant', content: accumulatedResponse }]);
              setStreamingResponse('');
              setIsGenerating(false);
            } else if (streamingResponse) {
              // Fallback in case we have streamingResponse but not accumulatedResponse
              setMessages(prev => [...prev, { role: 'assistant', content: streamingResponse }]);
              setStreamingResponse('');
              setIsGenerating(false);
            }
            break;
          }
          
          // Decode the chunk and append to the streaming response
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            accumulatedResponse += chunk;
            setStreamingResponse(accumulatedResponse);
          }
        } catch (readError) {
          console.error('Error reading stream:', readError);
          if (accumulatedResponse) {
            // Save what we've got so far
            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: accumulatedResponse + "\n\n[Error: Stream reading interrupted]" 
            }]);
          }
          throw readError;
        }
      }
    } catch (error) {
      // Don't show error if it was aborted
      if (error.name !== 'AbortError') {
        console.error('Error getting response:', error);
        toast.error(`Failed to get response: ${error.message}. Make sure Ollama is running and the model is available.`);
        
        // Add error message to chat
        setMessages(prev => [...prev, { 
          role: 'system', 
          content: `Error: ${error.message}. Please check that Ollama is running and try again.` 
        }]);
      }
      setIsGenerating(false);
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingResponse]);

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto relative">
      <AdvancedSettings 
        selectedModel={selectedModel}
        onModelSelect={handleModelSelect}
        systemPrompt={systemPrompt}
        onSystemPromptChange={handleSystemPromptChange}
        onParametersChange={handleParametersChange}
      />
      
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            PDF Chat Assistant
          </CardTitle>
          <div className="mt-2">
            <FileInput onFileChange={handleFileChange} disabled={isPdfLoading} accept=".pdf" />
            {pdfName && (
              <p className="text-sm text-muted-foreground mt-2">
                Current PDF: <span className="font-medium">{pdfName}</span>
                {isPdfLoading && <span className="ml-2 text-yellow-500">(Processing...)</span>}
                {!isPdfLoading && <span className="ml-2 text-xs">
                  {isFullContent 
                    ? '(Full content extracted)' 
                    : '(Basic info only)'}
                </span>}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              Current Model: <span className="font-medium">{selectedModel}</span>
              {modelParameters.temperature !== 0.7 && 
                <span className="ml-2 text-xs">(Custom parameters applied)</span>
              }
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <p>Upload a PDF and ask questions about it.</p>
                <p className="text-sm mt-2">The AI will answer based on the PDF content.</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 
                    message.role === 'system' ? 'justify-center' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : message.role === 'system'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100 text-xs'
                        : 'bg-muted text-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              
              {/* Streaming response */}
              {streamingResponse && isGenerating && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                    <p className="whitespace-pre-wrap text-sm">{streamingResponse}</p>
                    <div className="mt-1 flex items-center">
                      <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse mr-1"></span>
                      <span className="text-xs text-muted-foreground">Generating...</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </CardContent>
        <CardFooter>
          <form onSubmit={handleSendMessage} className="w-full flex gap-2">
            <Input
              placeholder="Ask a question about the PDF..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading || !pdfContent || isPdfLoading}
            />
            {isLoading ? (
              <Button type="button" variant="destructive" onClick={cancelStreamingResponse}>
                Stop
              </Button>
            ) : (
              <Button type="submit" disabled={!pdfContent || isPdfLoading}>
                {isPdfLoading ? 'Processing PDF...' : 'Send'}
              </Button>
            )}
          </form>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ChatInterface; 