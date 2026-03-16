import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, ArrowRight, Bot, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useUnreadBriefings, useMarkBriefingRead } from '@/hooks/useFlowPilotBriefings';
import type { Briefing, BriefingActionItem } from '@/hooks/useFlowPilotBriefings';
import { cn } from '@/lib/utils';

function HealthScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-destructive';
  const bg = score >= 75 ? 'bg-emerald-500/10' : score >= 50 ? 'bg-amber-500/10' : 'bg-destructive/10';
  return (
    <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', bg, color)}>
      <Sparkles className="h-3 w-3" />
      {score}/100
    </div>
  );
}

function ActionItemRow({ item }: { item: BriefingActionItem }) {
  const Icon = item.priority === 'high' ? AlertTriangle : item.priority === 'medium' ? TrendingUp : CheckCircle;
  const color = item.priority === 'high' ? 'text-destructive' : item.priority === 'medium' ? 'text-amber-500' : 'text-muted-foreground';

  return (
    <Link
      to={item.link}
      className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors text-sm"
    >
      <Icon className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', color)} />
      <span className="flex-1 text-foreground/80">{item.text}</span>
      <ArrowRight className="h-3 w-3 mt-1 text-muted-foreground shrink-0" />
    </Link>
  );
}

function BriefingCard({ briefing, onRead }: { briefing: Briefing; onRead: () => void }) {
  const metrics = briefing.metrics;
  const actionItems = (briefing.action_items || []) as BriefingActionItem[];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">
            {new Date(briefing.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <HealthScoreBadge score={metrics?.health_score || 0} />
      </div>

      <p className="text-sm text-foreground/90">{briefing.summary}</p>

      {/* Key metrics row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 rounded-md bg-muted/50">
          <p className="text-lg font-bold">{metrics?.traffic_today || 0}</p>
          <p className="text-[10px] text-muted-foreground">Visitors</p>
        </div>
        <div className="text-center p-2 rounded-md bg-muted/50">
          <p className="text-lg font-bold">{metrics?.leads_today || 0}</p>
          <p className="text-[10px] text-muted-foreground">Leads</p>
        </div>
        <div className="text-center p-2 rounded-md bg-muted/50">
          <div className="flex items-center justify-center gap-1">
            <p className="text-lg font-bold">{metrics?.traffic_trend || 0}%</p>
            {(metrics?.traffic_trend || 0) >= 0 
              ? <TrendingUp className="h-3 w-3 text-emerald-500" /> 
              : <TrendingDown className="h-3 w-3 text-destructive" />
            }
          </div>
          <p className="text-[10px] text-muted-foreground">Traffic</p>
        </div>
      </div>

      {/* Action items */}
      {actionItems.length > 0 && (
        <>
          <Separator />
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-1">Action Items</p>
            {actionItems.slice(0, 3).map((item, i) => (
              <ActionItemRow key={i} item={item} />
            ))}
          </div>
        </>
      )}

      <Button variant="ghost" size="sm" className="w-full text-xs" onClick={onRead}>
        Mark as read
      </Button>
    </div>
  );
}

export function FlowPilotBriefingBell() {
  const { data: unread = [] } = useUnreadBriefings();
  const markRead = useMarkBriefingRead();
  const [open, setOpen] = useState(false);

  const count = unread.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
              {count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            FlowPilot Briefings
          </h4>
        </div>
        <div className="p-3 max-h-[400px] overflow-y-auto">
          {unread.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground/60 mt-1">FlowPilot will brief you daily</p>
            </div>
          ) : (
            <div className="space-y-4">
              {unread.map((b) => (
                <BriefingCard
                  key={b.id}
                  briefing={b}
                  onRead={() => {
                    markRead.mutate(b.id);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
