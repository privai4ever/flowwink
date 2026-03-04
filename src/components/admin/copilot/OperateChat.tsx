import { useRef, useEffect, useState } from 'react';
import { ArrowUp, Loader2, Terminal, RotateCcw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import type { OperateMessage } from '@/hooks/useAgentOperate';
import type { AgentSkill } from '@/types/agent';

interface OperateChatProps {
  messages: OperateMessage[];
  skills: AgentSkill[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onReset: () => void;
}

const QUICK_ACTIONS = [
  { label: 'Analyze this week', action: 'Analyze my site traffic for this week' },
  { label: 'Write a blog post', action: 'Write a blog post about our latest product update' },
  { label: 'Check leads', action: 'Show me recent lead activity' },
];

export function OperateChat({ messages, skills, isLoading, onSendMessage, onReset }: OperateChatProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const isEmpty = messages.length === 0;

  // Get all skill results (support both old and new format)
  const getSkillResults = (msg: OperateMessage) => {
    if (msg.skillResults?.length) return msg.skillResults;
    if (msg.skillResult) return [msg.skillResult];
    return [];
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-6">
            <div className="p-3 rounded-2xl bg-primary/10">
              <Terminal className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-lg font-semibold">Operate Mode</h2>
              <p className="text-sm text-muted-foreground">
                Tell me what you need — I can write blog posts, add leads, analyze traffic, 
                send newsletters, and more. I have access to <strong>{skills.length}</strong> skills.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_ACTIONS.map((qa) => (
                <Button
                  key={qa.label}
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => onSendMessage(qa.action)}
                >
                  {qa.label}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5 justify-center max-w-sm">
              {skills.slice(0, 8).map(s => (
                <Badge key={s.id} variant="secondary" className="text-xs font-normal">
                  {s.name.replace(/_/g, ' ')}
                </Badge>
              ))}
              {skills.length > 8 && (
                <Badge variant="secondary" className="text-xs font-normal">
                  +{skills.length - 8} more
                </Badge>
              )}
            </div>
          </div>
        ) : (
          <div className="py-4 px-4 space-y-4">
            {messages.map((msg) => {
              const results = getSkillResults(msg);
              return (
                <div key={msg.id} className={cn(
                  'flex gap-3',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}>
                  <div className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}

                    {results.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/30 space-y-1.5">
                        {results.map((sr, i) => (
                          <div key={i}>
                            <Badge variant={
                              sr.status === 'success' ? 'default' :
                              sr.status === 'pending_approval' ? 'secondary' : 'destructive'
                            } className="text-xs">
                              {sr.skill.replace(/_/g, ' ')} — {sr.status}
                            </Badge>
                            {sr.result && (
                              <pre className="mt-1 text-xs opacity-70 overflow-auto max-h-24">
                                {JSON.stringify(sr.result, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={onReset} className="shrink-0" title="Clear conversation">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Tell FlowPilot what to do..."
            disabled={isLoading}
            className="rounded-full"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="shrink-0 rounded-full"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
