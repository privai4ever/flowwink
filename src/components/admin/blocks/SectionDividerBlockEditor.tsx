import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import type { SectionDividerBlockData } from '@/components/public/blocks/SectionDividerBlock';
import { SectionDividerBlock } from '@/components/public/blocks/SectionDividerBlock';

interface SectionDividerBlockEditorProps {
  data: SectionDividerBlockData;
  onChange: (data: SectionDividerBlockData) => void;
  isEditing: boolean;
}

export function SectionDividerBlockEditor({ data, onChange, isEditing }: SectionDividerBlockEditorProps) {
  if (!isEditing) {
    return (
      <div className="bg-muted/30 rounded overflow-hidden">
        <SectionDividerBlock data={data} />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Shape</Label>
          <Select
            value={data.shape || 'wave'}
            onValueChange={(v) => onChange({ ...data, shape: v as SectionDividerBlockData['shape'] })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="wave">Wave</SelectItem>
              <SelectItem value="diagonal">Diagonal</SelectItem>
              <SelectItem value="curved">Curved</SelectItem>
              <SelectItem value="zigzag">Zigzag</SelectItem>
              <SelectItem value="triangle">Triangle</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Height</Label>
          <Select
            value={data.height || 'md'}
            onValueChange={(v) => onChange({ ...data, height: v as 'sm' | 'md' | 'lg' })}
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Shape Color</Label>
          <Input
            type="color"
            value={data.color || '#ffffff'}
            onChange={(e) => onChange({ ...data, color: e.target.value })}
            className="h-9"
          />
        </div>
        <div className="space-y-2">
          <Label>Background Color</Label>
          <Input
            type="color"
            value={data.bgColor || '#000000'}
            onChange={(e) => onChange({ ...data, bgColor: e.target.value })}
            className="h-9"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label>Flip Horizontally</Label>
        <Switch checked={data.flip || false} onCheckedChange={(v) => onChange({ ...data, flip: v })} />
      </div>
      <div className="flex items-center justify-between">
        <Label>Invert (upside down)</Label>
        <Switch checked={data.invert || false} onCheckedChange={(v) => onChange({ ...data, invert: v })} />
      </div>

      {/* Preview */}
      <div className="border rounded-lg overflow-hidden bg-muted/30">
        <SectionDividerBlock data={data} />
      </div>
    </div>
  );
}
