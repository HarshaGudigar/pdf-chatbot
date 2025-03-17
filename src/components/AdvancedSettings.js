"use client"

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { X } from 'lucide-react';

const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant that answers questions based on the provided PDF content.
Use only the information from the PDF to answer the question.
If the answer cannot be found in the PDF content, say so clearly.`;

const AdvancedSettings = ({ 
  selectedModel, 
  onModelSelect, 
  systemPrompt = DEFAULT_SYSTEM_PROMPT,
  onSystemPromptChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modelName, setModelName] = useState(selectedModel);
  const [customPrompt, setCustomPrompt] = useState(systemPrompt);
  const [availableModels, setAvailableModels] = useState([
    'llama2', 'mistral', 'gemma', 'phi', 'llama3', 'mixtral'
  ]);
  const [isLoading, setIsLoading] = useState(false);

  // Toggle panel open/closed
  const togglePanel = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchModels();
    }
  };

  // Handle model change
  const handleModelChange = (e) => {
    setModelName(e.target.value);
  };

  // Handle system prompt change
  const handlePromptChange = (e) => {
    setCustomPrompt(e.target.value);
  };

  // Apply settings
  const applySettings = () => {
    onModelSelect(modelName);
    onSystemPromptChange(customPrompt);
    toast.success('Settings applied');
  };

  // Reset to defaults
  const resetDefaults = () => {
    setModelName('llama2');
    setCustomPrompt(DEFAULT_SYSTEM_PROMPT);
    onModelSelect('llama2');
    onSystemPromptChange(DEFAULT_SYSTEM_PROMPT);
    toast.success('Settings reset to defaults');
  };

  // Fetch available models from Ollama
  const fetchModels = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/models', {
        method: 'GET',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.models && Array.isArray(data.models)) {
          setAvailableModels(data.models);
        }
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update local state when props change
  useEffect(() => {
    setModelName(selectedModel);
    setCustomPrompt(systemPrompt);
  }, [selectedModel, systemPrompt]);

  return (
    <>
      {/* Toggle button in the top right */}
      <Button 
        variant="outline" 
        onClick={togglePanel}
        className="absolute top-4 right-4 z-10"
        size="sm"
      >
        Settings
      </Button>
      
      {/* Right sidebar */}
      <div className={`fixed right-0 top-0 h-full w-80 bg-background border-l border-border shadow-lg transform transition-transform duration-300 ease-in-out z-20 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold">Advanced Settings</h2>
            <Button variant="ghost" size="icon" onClick={togglePanel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Ollama Model
              </label>
              <div className="flex gap-2">
                <Input
                  value={modelName}
                  onChange={handleModelChange}
                  placeholder="Enter model name (e.g., llama2)"
                  list="advanced-model-options"
                  disabled={isLoading}
                  className="flex-1"
                />
                <datalist id="advanced-model-options">
                  {availableModels.map((model) => (
                    <option key={model} value={model} />
                  ))}
                </datalist>
                <Button 
                  onClick={fetchModels} 
                  variant="outline" 
                  disabled={isLoading}
                  size="sm"
                >
                  Refresh
                </Button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                System Prompt
              </label>
              <Textarea
                value={customPrompt}
                onChange={handlePromptChange}
                placeholder="Enter custom system prompt..."
                className="min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The system prompt controls how the AI responds to your questions.
              </p>
            </div>
          </div>
          
          <div className="p-4 border-t flex justify-between">
            <Button variant="outline" onClick={resetDefaults}>
              Reset
            </Button>
            <Button onClick={applySettings}>
              Apply
            </Button>
          </div>
        </div>
      </div>
      
      {/* Overlay when sidebar is open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-10"
          onClick={togglePanel}
        />
      )}
    </>
  );
};

export default AdvancedSettings; 