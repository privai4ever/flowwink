/**
 * ProactiveMessageCard
 * 
 * Renders rich cards for FlowPilot proactive messages in the chat stream.
 * Supports briefings, HIL approvals, and general notifications with
 * deep-link action buttons.
 */

import { Bot, Sparkles, ArrowRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

export interface ActionButton {
  label: string;
  link?: string;
  action?: string;        // e.g. 'approve', 'reject', 'preview'
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  skill?: string;         // skill to execute on click
  skillArgs?: Record<string, unknown>;
}

export interface ProactivePayload {
  type: 'briefing' | 'approval' | 'alert' | 'update';
  title?: string;
  healthScore?: number;
  metrics?: Array<{ label: string; value: string | number }>;
  actions?: ActionButton[];
}

interface ProactiveMessageCardProps {
  content: string;
  payload: ProactivePayload;
  createdAt?: string;
  onAction?: (action: ActionButton) => void;
}

function HealthBadge({ score }: { score: number }) {
  const color = score >= 75 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-destructive';
  const bg = score >= 75 ? 'bg-emerald-500/10' : score >= 50 ? 'bg-amber-500/10' : 'bg-destructive/10';
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold', bg, color)}>
      <Sparkles className="h-3 w-3" />
      {score}/100
    </span>
  );
}

export function ProactiveMessageCard({ content, payload, createdAt, onAction }: ProactiveMessageCardProps) {
  const navigate = useNavigate();

  const handleAction = (btn: ActionButton) => {
    if (onAction) {
      onAction(btn);
    } else if (btn.link) {
      if (btn.link.startsWith('/')) {
        navigate(btn.link);
      } else {
        window.open(btn.link, '_blank');
      }
    }
  };

  const typeIcon = payload.type === 'approval' ? '📝' : payload.type === 'alert' ? '⚠️' : payload.type === 'briefing' ? '☀️' : '🤖';

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Bot className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">FlowPilot</span>
          {createdAt && (
            <span className="text-[10px] text-muted-foreground/60">
              {new Date(createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {payload.healthScore != null && <HealthBadge score={payload.healthScore} />}
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {typeIcon} {payload.type}
          </Badge>
        </div>

        {/* Content card */}
        <div className="rounded-2xl bg-muted border border-border/50 overflow-hidden">
          {payload.title && (
            <div className="px-4 pt-3 pb-1">
              <h4 className="text-sm font-semibold text-foreground">{payload.title}</h4>
            </div>
          )}

          {/* Markdown body */}
          <div className="px-4 py-2">
            <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          </div>

          {/* Inline metrics */}
          {payload.metrics && payload.metrics.length > 0 && (
            <>
              <Separator />
              <div className="px-4 py-2 flex flex-wrap gap-4">
                {payload.metrics.map((m, i) => (
                  <div key={i} className="text-center">
                    <p className="text-base font-bold text-foreground">{m.value}</p>
                    <p className="text-[10px] text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Action buttons */}
          {payload.actions && payload.actions.length > 0 && (
            <>
              <Separator />
              <div className="px-4 py-2.5 flex flex-wrap gap-2">
                {payload.actions.map((btn, i) => (
                  <Button
                    key={i}
                    variant={btn.variant || (i === 0 ? 'default' : 'outline')}
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => handleAction(btn)}
                  >
                    {btn.label}
                    {btn.link && <ArrowRight className="h-3 w-3" />}
                  </Button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
