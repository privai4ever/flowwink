import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KbPageSlugField } from './KbPageSlugField';
import { KbHubBlock } from '@/components/public/blocks/KbHubBlock';
import type { KbHubBlockData } from '@/components/public/blocks/KbHubBlock';

interface KbHubBlockEditorProps {
  data: KbHubBlockData;
  onChange: (data: KbHubBlockData) => void;
  isEditing?: boolean;
}

export function KbHubBlockEditor({ data, onChange, isEditing }: KbHubBlockEditorProps) {
  // Preview mode
  if (!isEditing) {
    return <KbHubBlock data={data} />;
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Header</h4>
        
        <div className="space-y-2">
          <Label htmlFor="kb-hub-title">Title</Label>
          <Input
            id="kb-hub-title"
            value={data.title || ''}
            onChange={(e) => onChange({ ...data, title: e.target.value })}
            placeholder="How can we help you?"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="kb-hub-subtitle">Subtitle</Label>
          <Textarea
            id="kb-hub-subtitle"
            value={data.subtitle || ''}
            onChange={(e) => onChange({ ...data, subtitle: e.target.value })}
            placeholder="Search our knowledge base or browse by category"
            rows={2}
          />
        </div>
      </div>

      {/* Search Section */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Search</h4>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="kb-hub-show-search">Show search field</Label>
          <Switch
            id="kb-hub-show-search"
            checked={data.showSearch !== false}
            onCheckedChange={(checked) => onChange({ ...data, showSearch: checked })}
          />
        </div>

        {data.showSearch !== false && (
          <div className="space-y-2">
            <Label htmlFor="kb-hub-search-placeholder">Search field placeholder</Label>
            <Input
              id="kb-hub-search-placeholder"
              value={data.searchPlaceholder || ''}
              onChange={(e) => onChange({ ...data, searchPlaceholder: e.target.value })}
              placeholder="Search for questions or answers..."
            />
          </div>
        )}
      </div>

      {/* Display Section */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Display</h4>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="kb-hub-show-categories">Show category filter</Label>
          <Switch
            id="kb-hub-show-categories"
            checked={data.showCategories !== false}
            onCheckedChange={(checked) => onChange({ ...data, showCategories: checked })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="kb-hub-layout">Layout</Label>
          <Select
            value={data.layout || 'accordion'}
            onValueChange={(value: 'accordion' | 'cards') => onChange({ ...data, layout: value })}
          >
            <SelectTrigger id="kb-hub-layout">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="accordion">Accordion (expandable questions)</SelectItem>
              <SelectItem value="cards">Cards (clickable links)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Empty State Section */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Empty State</h4>
        
        <div className="space-y-2">
          <Label htmlFor="kb-hub-empty-title">Title when no results</Label>
          <Input
            id="kb-hub-empty-title"
            value={data.emptyStateTitle || ''}
            onChange={(e) => onChange({ ...data, emptyStateTitle: e.target.value })}
            placeholder="No results found"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="kb-hub-empty-subtitle">Text when no results</Label>
          <Input
            id="kb-hub-empty-subtitle"
            value={data.emptyStateSubtitle || ''}
            onChange={(e) => onChange({ ...data, emptyStateSubtitle: e.target.value })}
            placeholder="Try other search terms..."
          />
        </div>
      </div>

      {/* KB Page Slug */}
      <KbPageSlugField
        id="kb-hub-page-slug"
        value={data.kbPageSlug || ''}
        onChange={(value) => onChange({ ...data, kbPageSlug: value })}
      />

      {/* Contact CTA Section */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Contact CTA</h4>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="kb-hub-show-cta">Show contact section</Label>
          <Switch
            id="kb-hub-show-cta"
            checked={data.showContactCta !== false}
            onCheckedChange={(checked) => onChange({ ...data, showContactCta: checked })}
          />
        </div>

        {data.showContactCta !== false && (
          <>
            <div className="space-y-2">
              <Label htmlFor="kb-hub-contact-title">Contact title</Label>
              <Input
                id="kb-hub-contact-title"
                value={data.contactTitle || ''}
                onChange={(e) => onChange({ ...data, contactTitle: e.target.value })}
                placeholder="Can't find the answer?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kb-hub-contact-subtitle">Contact subtitle</Label>
              <Input
                id="kb-hub-contact-subtitle"
                value={data.contactSubtitle || ''}
                onChange={(e) => onChange({ ...data, contactSubtitle: e.target.value })}
                placeholder="Our team is happy to help..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kb-hub-contact-button">Button text</Label>
              <Input
                id="kb-hub-contact-button"
                value={data.contactButtonText || ''}
                onChange={(e) => onChange({ ...data, contactButtonText: e.target.value })}
                placeholder="Contact us"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kb-hub-contact-link">Contact link</Label>
              <Input
                id="kb-hub-contact-link"
                value={data.contactLink || ''}
                onChange={(e) => onChange({ ...data, contactLink: e.target.value })}
                placeholder="/contact"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
