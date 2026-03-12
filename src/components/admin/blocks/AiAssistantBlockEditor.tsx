import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, ShoppingBag, Search, Star, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AiAssistantBlockData } from '@/components/public/blocks/AiAssistantBlock';

interface AiAssistantBlockEditorProps {
  data: AiAssistantBlockData;
  onChange: (data: AiAssistantBlockData) => void;
  isEditing?: boolean;
}

const iconMap = { sparkles: Sparkles, shopping: ShoppingBag, search: Search };

export function AiAssistantBlockEditor({ data, onChange, isEditing }: AiAssistantBlockEditorProps) {
  const handleChange = (key: keyof AiAssistantBlockData, value: unknown) => {
    onChange({ ...data, [key]: value });
  };

  const handlePromptChange = (index: number, value: string) => {
    const prompts = [...(data.suggestedPrompts || [])];
    prompts[index] = value;
    onChange({ ...data, suggestedPrompts: prompts });
  };

  const addPrompt = () => {
    onChange({ ...data, suggestedPrompts: [...(data.suggestedPrompts || []), ''] });
  };

  const removePrompt = (index: number) => {
    const prompts = (data.suggestedPrompts || []).filter((_, i) => i !== index);
    onChange({ ...data, suggestedPrompts: prompts });
  };

  // Preview mode — matches public AiAssistantBlock
  if (!isEditing) {
    const title = data.title || 'Find Your Perfect Product';
    const subtitle = data.subtitle;
    const placeholder = data.placeholder || 'What are you looking for?';
    const variant = data.variant || 'card';
    const prompts = (data.suggestedPrompts || []).slice(0, 4);
    const showBadge = data.showBadge !== false;
    const badgeText = data.badgeText || 'AI-Powered';
    const IconComponent = iconMap[data.iconStyle || 'sparkles'] || Sparkles;
    const isHero = variant === 'hero';

    return (
      <div className={cn('py-8 px-4', isHero && 'py-16 bg-gradient-to-b from-muted/40 to-background')}>
        <div className="w-full max-w-2xl mx-auto">
          {showBadge && (
            <div className="flex justify-center mb-5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="h-3 w-3" />
                {badgeText}
              </span>
            </div>
          )}
          <div className="text-center mb-6">
            <h2 className={cn('font-serif tracking-tight', isHero ? 'text-4xl' : 'text-2xl md:text-3xl')}>
              {title}
            </h2>
            {subtitle && (
              <p className="text-muted-foreground mt-2 text-sm md:text-base">{subtitle}</p>
            )}
          </div>
          {/* Search bar */}
          <div className={cn(
            'relative flex items-center rounded-2xl border-2 bg-background shadow-md',
            isHero ? 'border-border' : 'border-border',
          )}>
            <IconComponent className="absolute left-5 h-5 w-5 text-muted-foreground" />
            <div className={cn(
              'flex-1 pl-14 pr-4 text-muted-foreground',
              isHero ? 'py-7 text-lg' : 'py-5 text-base',
            )}>
              {placeholder}
            </div>
            <div className={cn(
              'absolute right-3 rounded-xl bg-primary flex items-center justify-center text-primary-foreground',
              isHero ? 'h-12 w-12' : 'h-10 w-10',
            )}>
              <ArrowRight className="h-5 w-5" />
            </div>
          </div>
          {/* Suggested prompts */}
          {prompts.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {prompts.map((prompt, i) => (
                <span key={i} className="px-4 py-2 rounded-full text-sm border bg-background text-muted-foreground">
                  {prompt}
                </span>
              ))}
            </div>
          )}
          {/* Trust indicator */}
          <div className="mt-5 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3 w-3 fill-current text-yellow-500" />
            <span>Powered by AI • Knows your entire product catalog</span>
          </div>
        </div>
      </div>
    );
  }

  // Edit mode
  const prompts = data.suggestedPrompts || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={data.title || ''}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Find Your Perfect Product"
          />
        </div>
        <div className="space-y-2">
          <Label>Subtitle</Label>
          <Input
            value={data.subtitle || ''}
            onChange={(e) => handleChange('subtitle', e.target.value)}
            placeholder="Ask our AI anything…"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Placeholder Text</Label>
          <Input
            value={data.placeholder || ''}
            onChange={(e) => handleChange('placeholder', e.target.value)}
            placeholder="What are you looking for?"
          />
        </div>
        <div className="space-y-2">
          <Label>Variant</Label>
          <Select value={data.variant || 'card'} onValueChange={(v) => handleChange('variant', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="hero">Hero</SelectItem>
              <SelectItem value="minimal">Minimal</SelectItem>
              <SelectItem value="split">Split</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Icon Style</Label>
          <Select value={data.iconStyle || 'sparkles'} onValueChange={(v) => handleChange('iconStyle', v as AiAssistantBlockData['iconStyle'])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sparkles">Sparkles (AI)</SelectItem>
              <SelectItem value="shopping">Shopping Bag</SelectItem>
              <SelectItem value="search">Search</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Badge Text</Label>
          <Input
            value={data.badgeText || ''}
            onChange={(e) => handleChange('badgeText', e.target.value)}
            placeholder="AI-Powered Shopping"
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Show Badge</p>
          <p className="text-xs text-muted-foreground">Display the AI badge above the title</p>
        </div>
        <Switch
          checked={data.showBadge !== false}
          onCheckedChange={(v) => handleChange('showBadge', v)}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Suggested Prompts</Label>
          <Button type="button" variant="outline" size="sm" onClick={addPrompt} className="gap-1">
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
        {prompts.map((prompt, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={prompt}
              onChange={(e) => handlePromptChange(index, e.target.value)}
              placeholder={`Prompt ${index + 1}`}
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => removePrompt(index)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {prompts.length === 0 && (
          <p className="text-xs text-muted-foreground">No suggested prompts. Add some to guide visitors.</p>
        )}
      </div>
    </div>
  );
}
