"use client"

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { toast } from 'sonner';

const ModelSelector = ({ onModelSelect }) => {
  const [modelName, setModelName] = useState('llama2');
  const [availableModels, setAvailableModels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Fetch available models from Ollama via our proxy API
  const fetchModels = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/models', {
        method: 'GET',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.models && Array.isArray(data.models)) {
          const modelNames = data.models.map(model => model.name);
          setAvailableModels(modelNames);
          // Set default model to the first available one
          if (modelNames.length > 0) {
            setModelName(modelNames[0]);
            onModelSelect(modelNames[0]);
          }
        }
      } else {
        console.error('Failed to fetch models from Ollama');
        toast.error('Failed to connect to Ollama. Make sure it\'s running.');
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      toast.error('Failed to connect to Ollama. Make sure it\'s running.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleModelChange = (e) => {
    setModelName(e.target.value);
  };

  const handleModelSelect = () => {
    onModelSelect(modelName);
    toast.success(`Model set to ${modelName}`);
    setIsDropdownOpen(false);
  };

  const selectModel = (model) => {
    setModelName(model);
    onModelSelect(model);
    toast.success(`Model set to ${model}`);
    setIsDropdownOpen(false);
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg">Select Ollama Model</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={modelName}
                onChange={handleModelChange}
                placeholder="Enter model name (e.g., llama2)"
                disabled={isLoading}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="cursor-pointer"
              />
              {isDropdownOpen && availableModels.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                  {availableModels.map((model) => (
                    <div
                      key={model}
                      className="px-4 py-2 hover:bg-accent cursor-pointer"
                      onClick={() => selectModel(model)}
                    >
                      {model}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={handleModelSelect} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Set Model'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {availableModels.length > 0 
              ? `Available models: ${availableModels.join(', ')}` 
              : 'No models found. Make sure Ollama is running.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ModelSelector; 