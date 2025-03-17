"use client"

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Slider } from './ui/slider';
import { toast } from 'sonner';
import { X, RefreshCw, Info } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant that answers questions based on the provided PDF content.
Use only the information from the PDF to answer the question.
If the answer cannot be found in the PDF content, say so clearly.`;

const DEFAULT_SETTINGS = {
  model: 'llama2',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 2000,
  presencePenalty: 0,
  frequencyPenalty: 0
};

const AdvancedSettings = ({ 
  selectedModel, 
  onModelSelect, 
  systemPrompt = DEFAULT_SYSTEM_PROMPT,
  onSystemPromptChange,
  onParametersChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState({
    model: selectedModel,
    systemPrompt: systemPrompt,
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 2000,
    presencePenalty: 0,
    frequencyPenalty: 0
  });
  const [availableModels, setAvailableModels] = useState([
    'llama2', 'mistral', 'gemma', 'phi', 'llama3', 'mixtral'
  ]);
  const [isLoading, setIsLoading] = useState(false);

  // Load settings from session storage on initial render
  useEffect(() => {
    const savedSettings = sessionStorage.getItem('pdfChatSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(prevSettings => ({
          ...prevSettings,
          ...parsedSettings
        }));
        
        // Apply loaded settings to parent component
        onModelSelect(parsedSettings.model);
        onSystemPromptChange(parsedSettings.systemPrompt);
        if (onParametersChange) {
          onParametersChange({
            temperature: parsedSettings.temperature,
            top_p: parsedSettings.topP,
            max_tokens: parsedSettings.maxTokens,
            presence_penalty: parsedSettings.presencePenalty,
            frequency_penalty: parsedSettings.frequencyPenalty
          });
        }
      } catch (error) {
        console.error('Error parsing saved settings:', error);
      }
    }
  }, []);

  // Toggle panel open/closed
  const togglePanel = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchModels();
    }
  };

  // Handle setting change
  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Apply settings
  const applySettings = () => {
    // Update parent component
    onModelSelect(settings.model);
    onSystemPromptChange(settings.systemPrompt);
    
    if (onParametersChange) {
      onParametersChange({
        temperature: settings.temperature,
        top_p: settings.topP,
        max_tokens: settings.maxTokens,
        presence_penalty: settings.presencePenalty,
        frequency_penalty: settings.frequencyPenalty
      });
    }
    
    // Save to session storage
    sessionStorage.setItem('pdfChatSettings', JSON.stringify(settings));
    
    toast.success('Settings applied and saved');
  };

  // Reset to defaults
  const resetDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    
    // Update parent component
    onModelSelect(DEFAULT_SETTINGS.model);
    onSystemPromptChange(DEFAULT_SETTINGS.systemPrompt);
    
    if (onParametersChange) {
      onParametersChange({
        temperature: DEFAULT_SETTINGS.temperature,
        top_p: DEFAULT_SETTINGS.topP,
        max_tokens: DEFAULT_SETTINGS.maxTokens,
        presence_penalty: DEFAULT_SETTINGS.presencePenalty,
        frequency_penalty: DEFAULT_SETTINGS.frequencyPenalty
      });
    }
    
    // Clear from session storage
    sessionStorage.removeItem('pdfChatSettings');
    
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
          
          // If current model is not in the list, select the first available model
          if (data.models.length > 0 && !data.models.includes(settings.model)) {
            handleSettingChange('model', data.models[0]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      toast.error('Failed to fetch models');
    } finally {
      setIsLoading(false);
    }
  };

  // Update local state when props change
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      model: selectedModel,
      systemPrompt: systemPrompt
    }));
  }, [selectedModel, systemPrompt]);

  // Parameter info tooltips
  const parameterInfo = {
    temperature: "Controls randomness. Lower values make responses more focused and deterministic.",
    topP: "Controls diversity. Lower values make responses more focused on likely tokens.",
    maxTokens: "Maximum number of tokens to generate in the response.",
    presencePenalty: "Reduces repetition by penalizing tokens that have already appeared in the text.",
    frequencyPenalty: "Reduces repetition by penalizing tokens that appear frequently in the generated text."
  };

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
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Ollama Model
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select 
                    value={settings.model} 
                    onValueChange={(value) => handleSettingChange('model', value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={fetchModels} 
                  variant="outline" 
                  disabled={isLoading}
                  size="icon"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
            
            {/* Temperature */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">
                  Temperature
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                        <Info className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">{parameterInfo.temperature}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center gap-2">
                <Slider 
                  value={[settings.temperature]} 
                  min={0} 
                  max={2} 
                  step={0.1}
                  onValueChange={(value) => handleSettingChange('temperature', value[0])}
                />
                <span className="text-sm w-8 text-right">{settings.temperature}</span>
              </div>
            </div>
            
            {/* Top P */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">
                  Top P
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                        <Info className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">{parameterInfo.topP}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center gap-2">
                <Slider 
                  value={[settings.topP]} 
                  min={0} 
                  max={1} 
                  step={0.05}
                  onValueChange={(value) => handleSettingChange('topP', value[0])}
                />
                <span className="text-sm w-8 text-right">{settings.topP}</span>
              </div>
            </div>
            
            {/* Max Tokens */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">
                  Max Tokens
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                        <Info className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">{parameterInfo.maxTokens}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={100}
                  max={8000}
                  value={settings.maxTokens}
                  onChange={(e) => handleSettingChange('maxTokens', parseInt(e.target.value) || 2000)}
                  className="w-full"
                />
              </div>
            </div>
            
            {/* Presence Penalty */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">
                  Presence Penalty
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                        <Info className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">{parameterInfo.presencePenalty}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center gap-2">
                <Slider 
                  value={[settings.presencePenalty]} 
                  min={-2} 
                  max={2} 
                  step={0.1}
                  onValueChange={(value) => handleSettingChange('presencePenalty', value[0])}
                />
                <span className="text-sm w-8 text-right">{settings.presencePenalty}</span>
              </div>
            </div>
            
            {/* Frequency Penalty */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">
                  Frequency Penalty
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                        <Info className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">{parameterInfo.frequencyPenalty}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center gap-2">
                <Slider 
                  value={[settings.frequencyPenalty]} 
                  min={-2} 
                  max={2} 
                  step={0.1}
                  onValueChange={(value) => handleSettingChange('frequencyPenalty', value[0])}
                />
                <span className="text-sm w-8 text-right">{settings.frequencyPenalty}</span>
              </div>
            </div>
            
            {/* System Prompt */}
            <div>
              <label className="block text-sm font-medium mb-1">
                System Prompt
              </label>
              <Textarea
                value={settings.systemPrompt}
                onChange={(e) => handleSettingChange('systemPrompt', e.target.value)}
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