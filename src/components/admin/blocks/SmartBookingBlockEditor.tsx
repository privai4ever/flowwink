import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BookingBlockData } from '@/types/cms';

interface SmartBookingBlockEditorProps {
  data: BookingBlockData;
  onChange: (data: BookingBlockData) => void;
  isEditing?: boolean;
}

const MOCK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MOCK_DATES = [9, 10, 11, 12, 13, 14, 15];
const MOCK_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00'];

export function SmartBookingBlockEditor({ data, onChange, isEditing }: SmartBookingBlockEditorProps) {
  const handleChange = (key: keyof BookingBlockData, value: unknown) => {
    onChange({ ...data, [key]: value });
  };

  // Preview mode — matches the public SmartBookingBlock look
  if (!isEditing) {
    const title = data.title || 'Book an Appointment';
    const description = data.description;

    return (
      <div className={cn(
        'w-full',
        data.variant === 'card' && 'p-6',
      )}>
        <div className="max-w-2xl mx-auto">
          {title && (
            <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-2 text-center">{title}</h2>
          )}
          {description && (
            <p className="text-muted-foreground text-center mb-6 text-sm">{description}</p>
          )}

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((step, i) => (
              <div key={step} className="flex items-center">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}>
                  {step}
                </div>
                {i < 2 && <div className="w-12 h-0.5 mx-1 bg-muted" />}
              </div>
            ))}
          </div>

          {/* Mock service selection */}
          <div className="space-y-3 mb-8">
            <h3 className="font-medium text-base">Select a Service</h3>
            {[
              { name: '30-min Consultation', duration: 30 },
              { name: '60-min Deep Dive', duration: 60 },
            ].map((service, i) => (
              <div
                key={i}
                className={cn(
                  'p-4 rounded-lg border text-left',
                  i === 0 ? 'border-primary bg-primary/5' : 'border-border',
                )}
              >
                <div className="flex items-start justify-between">
                  <h4 className="font-medium text-sm">{service.name}</h4>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {service.duration} min
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mock week calendar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-1 rounded text-muted-foreground">
                <ChevronLeft className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Jul 9 – Jul 15, 2025</span>
              <div className="p-1 rounded text-muted-foreground">
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {MOCK_DAYS.map((day, i) => (
                <div
                  key={day}
                  className={cn(
                    'p-2 rounded-lg text-center',
                    i === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground',
                  )}
                >
                  <div className="text-xs font-medium">{day}</div>
                  <div className="text-base font-semibold mt-0.5">{MOCK_DATES[i]}</div>
                </div>
              ))}
            </div>
            {/* Mock time slots */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Available Times</h4>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {MOCK_SLOTS.map((slot, i) => (
                  <div
                    key={slot}
                    className={cn(
                      'px-3 py-2 rounded-md text-xs font-medium text-center',
                      i === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {slot}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Live booking — confirms instantly</span>
          </div>
        </div>
      </div>
    );
  }

  // Edit mode
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={data.title || ''}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Book an Appointment"
          />
        </div>
        <div className="space-y-2">
          <Label>Variant</Label>
          <Select value={data.variant || 'default'} onValueChange={(v) => handleChange('variant', v as BookingBlockData['variant'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="minimal">Minimal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Input
          value={data.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Select a service and a time that works for you."
        />
      </div>

      <div className="space-y-2">
        <Label>Submit Button Text</Label>
        <Input
          value={data.submitButtonText || ''}
          onChange={(e) => handleChange('submitButtonText', e.target.value)}
          placeholder="Confirm Booking"
        />
      </div>

      <div className="space-y-2">
        <Label>Success Message</Label>
        <Input
          value={data.successMessage || ''}
          onChange={(e) => handleChange('successMessage', e.target.value)}
          placeholder="Your booking is confirmed!"
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Show Phone Field</p>
          <p className="text-xs text-muted-foreground">Ask for phone number in the details step</p>
        </div>
        <Switch
          checked={data.showPhoneField !== false}
          onCheckedChange={(v) => handleChange('showPhoneField', v)}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Trigger Webhook on Booking</p>
          <p className="text-xs text-muted-foreground">Fire a webhook event when a booking is submitted</p>
        </div>
        <Switch
          checked={!!data.triggerWebhook}
          onCheckedChange={(v) => handleChange('triggerWebhook', v)}
        />
      </div>
    </div>
  );
}
