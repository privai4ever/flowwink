import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { KbAccordionBlock } from '@/components/public/blocks/KbAccordionBlock';
import type { KbAccordionBlockData } from '@/components/public/blocks/KbAccordionBlock';

interface KbAccordionBlockEditorProps {
  data: KbAccordionBlockData;
  onChange: (data: KbAccordionBlockData) => void;
  isEditing?: boolean;
}

export function KbAccordionBlockEditor({ data, onChange, isEditing }: KbAccordionBlockEditorProps) {
  // Fetch available categories
  const { data: categories } = useQuery({
    queryKey: ['kb-categories-for-editor'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_categories')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Preview mode
  if (!isEditing) {
    return <KbAccordionBlock data={data} />;
  }

  const handleChange = (field: keyof KbAccordionBlockData, value: unknown) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={data.title || ''}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Frequently Asked Questions"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subtitle">Subtitle</Label>
        <Input
          id="subtitle"
          value={data.subtitle || ''}
          onChange={(e) => handleChange('subtitle', e.target.value)}
          placeholder="Find answers to common questions"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="categorySlug">Filter by category</Label>
        <Select
          value={data.categorySlug || 'all'}
          onValueChange={(value) => handleChange('categorySlug', value === 'all' ? undefined : value)}
        >
          <SelectTrigger id="categorySlug">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat.id} value={cat.slug}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="variant">Variant</Label>
          <Select
            value={data.variant || 'default'}
            onValueChange={(value) => handleChange('variant', value)}
          >
            <SelectTrigger id="variant">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Standard</SelectItem>
              <SelectItem value="bordered">Bordered</SelectItem>
              <SelectItem value="minimal">Minimal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="defaultOpen">Default Open</Label>
          <Select
            value={data.defaultOpen || 'none'}
            onValueChange={(value) => handleChange('defaultOpen', value)}
          >
            <SelectTrigger id="defaultOpen">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="first">First</SelectItem>
              <SelectItem value="all">All (requires "Allow multiple open")</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="maxItems">Max number of articles</Label>
        <Input
          id="maxItems"
          type="number"
          min={1}
          max={50}
          value={data.maxItems || 10}
          onChange={(e) => handleChange('maxItems', Number(e.target.value))}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="showCategory">Show category</Label>
        <Switch
          id="showCategory"
          checked={data.showCategory === true}
          onCheckedChange={(checked) => handleChange('showCategory', checked)}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="allowMultiple">Allow multiple open at once</Label>
        <Switch
          id="allowMultiple"
          checked={data.allowMultiple === true}
          onCheckedChange={(checked) => handleChange('allowMultiple', checked)}
        />
      </div>
    </div>
  );
}
