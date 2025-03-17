"use client"

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Slider } from './ui/slider';
import { toast } from 'sonner';
import { X, RefreshCw, Info, Zap, Save, RotateCcw, Check, Sparkles, Sliders, Brain } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Card, CardContent } from './ui/card';

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

// Preset configurations for quick settings
const PRESETS = {
  precise: {
    name: "Precise",
    icon: <Brain className="h-3.5 w-3.5" />,
    description: "Factual & concise",
    settings: {
      temperature: 0.3,
      topP: 0.8,
      presencePenalty: 0,
      frequencyPenalty: 0.1
    }
  },
  balanced: {
    name: "Balanced",
    icon: <Sliders className="h-3.5 w-3.5" />,
    description: "Default balance",
    settings: {
      temperature: 0.7,
      topP: 0.9,
      presencePenalty: 0,
      frequencyPenalty: 0
    }
  },
  creative: {
    name: "Creative",
    icon: <Sparkles className="h-3.5 w-3.5" />,
    description: "More varied",
    settings: {
      temperature: 1.2,
      topP: 1.0,
      presencePenalty: 0.1,
      frequencyPenalty: 0.1
    }
  }
};

const AdvancedSettings = ({ 
  selectedModel, 
  onModelSelect, 
  systemPrompt = DEFAULT_SYSTEM_PROMPT,
  onSystemPromptChange,
  onParametersChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("parameters");
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
  const [unsavedChanges, setUnsavedChanges] = useState(false);

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
      
      // Fetch models but don't override saved model
      fetchModels(false);
    } else {
      // If no saved settings, fetch models and set the first one as default
      fetchModels(true);
    }
  }, []);

  // Toggle panel open/closed
  const togglePanel = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Reset unsaved changes indicator when opening panel
      setUnsavedChanges(false);
    } else if (unsavedChanges) {
      // Prompt user about unsaved changes when closing
      const confirmed = window.confirm("You have unsaved changes. Are you sure you want to close without applying?");
      if (!confirmed) {
        setIsOpen(true);
        return;
      }
    }
  };

  // Handle setting change
  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setUnsavedChanges(true);
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
    setUnsavedChanges(false);
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
    setUnsavedChanges(false);
  };

  // Apply preset
  const applyPreset = (presetKey) => {
    const preset = PRESETS[presetKey];
    if (!preset) return;
    
    setSettings(prev => ({
      ...prev,
      ...preset.settings
    }));
    
    toast.success(`Applied "${preset.name}" preset`);
    setUnsavedChanges(true);
  };

  // Fetch available models from Ollama
  const fetchModels = async (isInitialLoad = false) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/models', {
        method: 'GET',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.models && Array.isArray(data.models)) {
          setAvailableModels(data.models);
          
          // If current model is not in the list or this is initial load, select the first available model
          if (data.models.length > 0 && (!data.models.includes(settings.model) || isInitialLoad)) {
            const firstModel = data.models[0];
            handleSettingChange('model', firstModel);
            onModelSelect(firstModel);
          }
          
          // Show a toast if we're using fallback models
          if (data.fallback) {
            toast.warning("Using fallback model list. Ollama connection not detected.");
          }
        }
      } else {
        toast.error("Failed to fetch models from Ollama");
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
        variant="ghost" 
        onClick={togglePanel}
        className="fixed top-4 right-16 z-10 h-9 px-3 flex items-center gap-1.5 bg-background/80 backdrop-blur-sm border border-border/30 rounded-full shadow-sm"
        size="sm"
      >
        <Sliders className="h-3.5 w-3.5" />
        <span className="text-sm">Settings</span>
        {unsavedChanges && <Badge variant="outline" className="h-1.5 w-1.5 rounded-full bg-orange-500 p-0 absolute -top-0.5 -right-0.5" />}
      </Button>
      
      {/* Right sidebar */}
      <div className={`fixed right-0 top-0 h-full w-96 bg-background border-l border-border shadow-lg transform transition-transform duration-300 ease-in-out z-20 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b flex justify-between items-center bg-muted/50">
            <h2 className="font-semibold flex items-center gap-2 text-sm">
              <Sliders className="h-4 w-4" />
              Advanced Settings
              {unsavedChanges && <Badge className="text-xs bg-orange-500 text-white border-orange-500/20 ml-1">Unsaved</Badge>}
            </h2>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePanel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="px-4 pt-4">
              <TabsList className="w-full grid grid-cols-2 p-0.5">
                <TabsTrigger value="parameters" className="flex-1 rounded-sm text-xs py-1.5">Parameters</TabsTrigger>
                <TabsTrigger value="prompt" className="flex-1 rounded-sm text-xs py-1.5">System Prompt</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="parameters" className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Model Selection */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-foreground/80">
                    Ollama Model
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select 
                        value={settings.model} 
                        onValueChange={(value) => handleSettingChange('model', value)}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableModels.map((model) => (
                            <SelectItem key={model} value={model} className="text-sm">
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
                      className="h-9 w-9"
                      title="Refresh model list"
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
                
                {/* Presets */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-foreground/80">Presets</label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-5 w-5 p-0 text-muted-foreground">
                            <Info className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          <p className="max-w-xs text-xs">Quick parameter configurations for different response styles</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(PRESETS).map(([key, preset]) => (
                      <Button 
                        key={key}
                        variant="outline" 
                        size="sm"
                        className="h-16 py-1 flex flex-col items-center justify-center gap-1"
                        onClick={() => applyPreset(key)}
                      >
                        <div className="flex items-center gap-1.5">
                          {preset.icon}
                          <span>{preset.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground line-clamp-1 w-full text-center">{preset.description}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-5">
                <h3 className="text-sm font-medium text-foreground/80">Generation Parameters</h3>
                
                {/* Temperature */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium flex items-center gap-1">
                      Temperature
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <p className="max-w-xs text-xs">{parameterInfo.temperature}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </label>
                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{settings.temperature}</span>
                  </div>
                  <Slider 
                    value={[settings.temperature]} 
                    min={0} 
                    max={2} 
                    step={0.1}
                    onValueChange={(value) => handleSettingChange('temperature', value[0])}
                    className="my-1.5"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Precise</span>
                    <span>Creative</span>
                  </div>
                </div>
                
                {/* Top P */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium flex items-center gap-1">
                      Top P
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <p className="max-w-xs text-xs">{parameterInfo.topP}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </label>
                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{settings.topP}</span>
                  </div>
                  <Slider 
                    value={[settings.topP]} 
                    min={0} 
                    max={1} 
                    step={0.05}
                    onValueChange={(value) => handleSettingChange('topP', value[0])}
                    className="my-1.5"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Focused</span>
                    <span>Diverse</span>
                  </div>
                </div>
                
                {/* Max Tokens */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium flex items-center gap-1">
                      Max Tokens
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <p className="max-w-xs text-xs">{parameterInfo.maxTokens}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </label>
                  </div>
                  <Input
                    type="number"
                    min={100}
                    max={8000}
                    value={settings.maxTokens}
                    onChange={(e) => handleSettingChange('maxTokens', parseInt(e.target.value) || 2000)}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Shorter responses</span>
                    <span>Longer responses</span>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-5">
                <h3 className="text-sm font-medium text-foreground/80">Advanced Parameters</h3>
                
                {/* Presence Penalty */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium flex items-center gap-1">
                      Presence Penalty
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <p className="max-w-xs text-xs">{parameterInfo.presencePenalty}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </label>
                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{settings.presencePenalty}</span>
                  </div>
                  <Slider 
                    value={[settings.presencePenalty]} 
                    min={-2} 
                    max={2} 
                    step={0.1}
                    onValueChange={(value) => handleSettingChange('presencePenalty', value[0])}
                    className="my-1.5"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>May repeat</span>
                    <span>Avoid repetition</span>
                  </div>
                </div>
                
                {/* Frequency Penalty */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium flex items-center gap-1">
                      Frequency Penalty
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <p className="max-w-xs text-xs">{parameterInfo.frequencyPenalty}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </label>
                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{settings.frequencyPenalty}</span>
                  </div>
                  <Slider 
                    value={[settings.frequencyPenalty]} 
                    min={-2} 
                    max={2} 
                    step={0.1}
                    onValueChange={(value) => handleSettingChange('frequencyPenalty', value[0])}
                    className="my-1.5"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Common words</span>
                    <span>Varied vocabulary</span>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="prompt" className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground/80">System Prompt</label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5 p-0 text-muted-foreground">
                          <Info className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p className="max-w-xs text-xs">The system prompt controls how the AI responds to your questions.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                <Card className="mb-4 border-muted/50">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">
                      The system prompt sets the behavior and context for the AI. A good system prompt for PDF chat should:
                    </p>
                    <ul className="text-xs text-muted-foreground mt-2 list-disc pl-4 space-y-1">
                      <li>Instruct the AI to use information from the PDF</li>
                      <li>Set boundaries for what the AI should or shouldn't do</li>
                      <li>Specify how to handle information not in the PDF</li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Textarea
                  value={settings.systemPrompt}
                  onChange={(e) => handleSettingChange('systemPrompt', e.target.value)}
                  placeholder="Enter custom system prompt..."
                  className="min-h-[200px] font-mono text-sm resize-none"
                />
                
                <div className="flex justify-end mt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleSettingChange('systemPrompt', DEFAULT_SYSTEM_PROMPT)}
                    className="text-xs h-8 gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset to Default
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="p-4 border-t flex justify-between bg-muted/30">
            <Button variant="outline" onClick={resetDefaults} className="gap-1.5 h-9 text-xs">
              <RotateCcw className="h-3.5 w-3.5" />
              Reset All
            </Button>
            <Button onClick={applySettings} className="gap-1.5 h-9 text-xs">
              <Save className="h-3.5 w-3.5" />
              Apply Changes
            </Button>
          </div>
        </div>
      </div>
      
      {/* Overlay when sidebar is open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-10 backdrop-blur-[1px]"
          onClick={togglePanel}
        />
      )}
    </>
  );
};

export default AdvancedSettings; 