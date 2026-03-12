import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ShoppingBag } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import type { FeaturedProductBlockData } from '@/components/public/blocks/FeaturedProductBlock';

interface FeaturedProductBlockEditorProps {
  data: FeaturedProductBlockData;
  onChange: (data: FeaturedProductBlockData) => void;
  isEditing: boolean;
}

export function FeaturedProductBlockEditor({ data, onChange, isEditing }: FeaturedProductBlockEditorProps) {
  const { data: products = [] } = useProducts({ activeOnly: true });

  const updateData = (updates: Partial<FeaturedProductBlockData>) => {
    onChange({ ...data, ...updates });
  };

  const selectedProduct = products.find(p => p.id === data.productId);

  if (!isEditing) {
    return (
      <div className="p-6 text-center border-2 border-dashed rounded-lg bg-muted/30">
        <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-medium text-lg">Featured Product</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {selectedProduct?.name || 'No product selected'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 border rounded-lg bg-card">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <ShoppingBag className="h-4 w-4" />
        Featured Product - Settings
      </div>

      <div className="space-y-2">
        <Label>Product</Label>
        <Select
          value={data.productId || ''}
          onValueChange={(value) => updateData({ productId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a product" />
          </SelectTrigger>
          <SelectContent>
            {products.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Badge text</Label>
        <Input
          value={data.badge || ''}
          onChange={(e) => updateData({ badge: e.target.value })}
          placeholder="New, Sale, Best Seller..."
        />
      </div>

      <div className="space-y-2">
        <Label>CTA button text</Label>
        <Input
          value={data.ctaText || ''}
          onChange={(e) => updateData({ ctaText: e.target.value })}
          placeholder="Add to cart"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Image position</Label>
          <Select
            value={data.layout || 'image-left'}
            onValueChange={(value: 'image-left' | 'image-right') => updateData({ layout: value })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="image-left">Image left</SelectItem>
              <SelectItem value="image-right">Image right</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Background</Label>
          <Select
            value={data.backgroundStyle || 'default'}
            onValueChange={(value: 'default' | 'muted' | 'gradient') => updateData({ backgroundStyle: value })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="muted">Muted</SelectItem>
              <SelectItem value="gradient">Gradient</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label>Show description</Label>
        <Switch
          checked={data.showDescription !== false}
          onCheckedChange={(checked) => updateData({ showDescription: checked })}
        />
      </div>
    </div>
  );
}
