'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Model {
  id: string;
  name: string;
  provider: string;
  maxTokens: number;
  carbonIntensity: number; // gCO2e per 1k tokens
  latency: number; // ms per token
  cost: number; // $ per 1M tokens
}

const models: Model[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'OpenAI',
    maxTokens: 8192,
    carbonIntensity: 0.4,
    latency: 50,
    cost: 30,
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    maxTokens: 4096,
    carbonIntensity: 0.2,
    latency: 30,
    cost: 1.5,
  },
  {
    id: 'claude-2',
    name: 'Claude 2',
    provider: 'Anthropic',
    maxTokens: 100000,
    carbonIntensity: 0.35,
    latency: 75,
    cost: 11.02,
  },
  {
    id: 'llama-2-70b',
    name: 'Llama 2 70B',
    provider: 'Meta',
    maxTokens: 4096,
    carbonIntensity: 0.15,
    latency: 100,
    cost: 0.7,
  },
];

export function ModelSelector({
  value,
  onValueChange,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedModel = models.find((model) => model.id === value) || models[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-[240px] justify-between', className)}
        >
          <div className="flex items-center">
            <span className="font-medium">{selectedModel.name}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {selectedModel.provider}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search models..." />
          <CommandEmpty>No model found.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-y-auto">
            {models.map((model) => (
              <CommandItem
                key={model.id}
                value={model.id}
                onSelect={() => {
                  onValueChange(model.id);
                  setOpen(false);
                }}
                className="flex flex-col items-start gap-1"
              >
                <div className="flex w-full items-center">
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === model.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="font-medium">{model.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {model.provider}
                  </span>
                </div>
                <div className="ml-6 flex gap-4 text-xs text-muted-foreground">
                  <span>🌱 {model.carbonIntensity}g CO₂e/1k tokens</span>
                  <span>⚡ {model.latency}ms/token</span>
                  <span>${model.cost}/1M tokens</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
