"use client"

import React, { useState, useRef } from 'react';
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
  const [isFullContent, setIsFullContent] = useState(false);
  const messagesEndRef = useRef(null);

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
    
    // Clear input
    setQuery('');
    setIsLoading(true);
    
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
          systemPrompt: systemPrompt
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response');
      }
      
      const data = await response.json();
      
      // Add AI response to chat
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('Error getting response:', error);
      toast.error('Failed to get response from Ollama. Make sure it\'s running and the model is available.');
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll to bottom of messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto relative">
      <AdvancedSettings 
        selectedModel={selectedModel}
        onModelSelect={handleModelSelect}
        systemPrompt={systemPrompt}
        onSystemPromptChange={handleSystemPromptChange}
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
            messages.map((message, index) => (
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
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                      : 'bg-muted'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))
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
            <Button type="submit" disabled={isLoading || !pdfContent || isPdfLoading}>
              {isLoading ? 'Thinking...' : isPdfLoading ? 'Processing PDF...' : 'Send'}
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ChatInterface; 