import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, Plus, Trash2 } from 'lucide-react';
import type { TrustBarBlockData, TrustBarItem } from '@/components/public/blocks/TrustBarBlock';

const ICON_OPTIONS = [
  { value: 'truck', label: '🚚 Shipping' },
  { value: 'rotate-ccw', label: '↩️ Returns' },
  { value: 'shield-check', label: '🛡️ Security' },
  { value: 'credit-card', label: '💳 Payment' },
  { value: 'clock', label: '🕐 Support' },
  { value: 'star', label: '⭐ Quality' },
  { value: 'heart-handshake', label: '🤝 Trust' },
  { value: 'award', label: '🏆 Award' },
  { value: 'leaf', label: '🌿 Eco' },
  { value: 'zap', label: '⚡ Fast' },
  { value: 'globe', label: '🌍 Global' },
  { value: 'lock', label: '🔒 Secure' },
];

interface TrustBarBlockEditorProps {
  data: TrustBarBlockData;
  onChange: (data: TrustBarBlockData) => void;
  isEditing: boolean;
}

const DEFAULT_ITEMS: TrustBarItem[] = [
  { icon: 'truck', text: 'Free Shipping' },
  { icon: 'rotate-ccw', text: '30-Day Returns' },
  { icon: 'shield-check', text: 'Secure Payment' },
  { icon: 'clock', text: '24/7 Support' },
];

export function TrustBarBlockEditor({ data, onChange, isEditing }: TrustBarBlockEditorProps) {
  const items = data.items?.length ? data.items : DEFAULT_ITEMS;

  const updateData = (updates: Partial<TrustBarBlockData>) => {
    onChange({ ...data, ...updates });
  };

  const updateItem = (index: number, updates: Partial<TrustBarItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    updateData({ items: newItems });
  };

  const addItem = () => {
    updateData({ items: [...items, { icon: 'shield-check', text: 'New item' }] });
  };

  const removeItem = (index: number) => {
    updateData({ items: items.filter((_, i) => i !== index) });
  };

  if (!isEditing) {
    return (
      <div className="p-4 text-center border-2 border-dashed rounded-lg bg-muted/30">
        <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
        <h3 className="font-medium">Trust Bar</h3>
        <p className="text-xs text-muted-foreground">{items.length} items</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 border rounded-lg bg-card">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <ShieldCheck className="h-4 w-4" />
        Trust Bar - Settings
      </div>

      {/* Items */}
      <div className="space-y-3">
        <Label>Items</Label>
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Select
              value={item.icon || 'shield-check'}
              onValueChange={(value) => updateItem(i, { icon: value })}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ICON_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={item.text}
              onChange={(e) => updateItem(i, { text: e.target.value })}
              placeholder="Text..."
              className="flex-1"
            />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(i)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        {items.length < 6 && (
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add item
          </Button>
        )}
      </div>

      {/* Style */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Style</Label>
          <Select
            value={data.variant || 'default'}
            onValueChange={(value: 'default' | 'bordered' | 'filled') => updateData({ variant: value })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="bordered">Bordered</SelectItem>
              <SelectItem value="filled">Filled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Size</Label>
          <Select
            value={data.size || 'md'}
            onValueChange={(value: 'sm' | 'md' | 'lg') => updateData({ size: value })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Small</SelectItem>
              <SelectItem value="md">Medium</SelectItem>
              <SelectItem value="lg">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
