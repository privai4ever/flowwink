import { Paintbrush } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { SectionBackground } from '@/types/cms';

interface BlockBackgroundControlProps {
  value?: SectionBackground;
  onChange: (value: SectionBackground) => void;
}

const OPTIONS: { value: SectionBackground; label: string; preview: string }[] = [
  { value: 'none', label: 'Transparent', preview: 'bg-background border border-dashed border-border' },
  { value: 'muted', label: 'Muted', preview: 'bg-muted/50' },
  { value: 'accent', label: 'Accent', preview: 'bg-accent/20' },
  { value: 'dark', label: 'Dark', preview: 'bg-foreground' },
];

export function BlockBackgroundControl({ value = 'none', onChange }: BlockBackgroundControlProps) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={cn('h-7 w-7 bg-card', value !== 'none' && 'text-primary border-primary/50')}
            >
              <Paintbrush className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Section background</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-48 p-2" align="start">
        <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Section Background</p>
        <div className="grid grid-cols-2 gap-1.5">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={cn(
                'flex flex-col items-center gap-1.5 p-2 rounded-md border text-xs transition-colors',
                value === opt.value
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-transparent hover:bg-muted/50 text-muted-foreground'
              )}
            >
              <div className={cn('w-full h-6 rounded', opt.preview)} />
              {opt.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
