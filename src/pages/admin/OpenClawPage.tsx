import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bug,
  Lightbulb,
  ThumbsUp,
  Zap,
  AlertTriangle,
  PackageOpen,
  ArrowRightLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  useBetaTestSessions,
  useBetaTestFindings,
  useBetaTestExchanges,
  type BetaTestSession,
  type BetaTestFinding,
  type BetaTestExchange,
} from '@/hooks/useBetaTestData';

const FINDING_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  bug: Bug,
  ux_issue: AlertTriangle,
  suggestion: Lightbulb,
  positive: ThumbsUp,
  performance: Zap,
  missing_feature: PackageOpen,
};

const FINDING_COLORS: Record<string, string> = {
  bug: 'text-destructive',
  ux_issue: 'text-orange-500',
  suggestion: 'text-blue-500',
  positive: 'text-green-500',
  performance: 'text-yellow-500',
  missing_feature: 'text-purple-500',
};

const SEVERITY_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'default',
  critical: 'destructive',
};

const STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  running: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
};

function SessionCard({ session, isSelected, onSelect }: {
  session: BetaTestSession;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const StatusIcon = STATUS_ICON[session.status] || Clock;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/40 bg-card'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{session.scenario}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {session.peer_name} · {formatDistanceToNow(new Date(session.started_at), { addSuffix: true })}
          </p>
        </div>
        <StatusIcon className={`h-4 w-4 shrink-0 mt-0.5 ${
          session.status === 'running' ? 'animate-spin text-primary' :
          session.status === 'completed' ? 'text-green-500' : 'text-destructive'
        }`} />
      </div>
      {session.summary && (
        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{session.summary}</p>
      )}
      {session.duration_ms && (
        <p className="text-[10px] text-muted-foreground mt-1">
          {(session.duration_ms / 1000).toFixed(1)}s
        </p>
      )}
    </button>
  );
}

function FindingRow({ finding }: { finding: BetaTestFinding }) {
  const Icon = FINDING_ICONS[finding.type] || Bug;
  const color = FINDING_COLORS[finding.type] || 'text-muted-foreground';

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{finding.title}</p>
          <Badge variant={SEVERITY_VARIANT[finding.severity]} className="text-[10px] h-5">
            {finding.severity}
          </Badge>
          {finding.resolved_at && (
            <Badge variant="outline" className="text-[10px] h-5 text-green-600">resolved</Badge>
          )}
        </div>
        {finding.description && (
          <p className="text-xs text-muted-foreground mt-1">{finding.description}</p>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(finding.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

function ExchangeBubble({ exchange }: { exchange: BetaTestExchange }) {
  const isFromOpenClaw = exchange.direction === 'openclaw_to_flowpilot';

  return (
    <div className={`flex ${isFromOpenClaw ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[80%] rounded-xl px-3 py-2 ${
        isFromOpenClaw
          ? 'bg-muted text-foreground rounded-bl-sm'
          : 'bg-primary text-primary-foreground rounded-br-sm'
      }`}>
        <div className="flex items-center gap-1.5 mb-0.5">
          <Badge variant="outline" className="text-[9px] h-4 px-1 bg-background/20 border-none">
            {exchange.message_type}
          </Badge>
        </div>
        <p className="text-sm whitespace-pre-wrap">{exchange.content}</p>
        <p className={`text-[10px] mt-1 ${isFromOpenClaw ? 'text-muted-foreground' : 'text-primary-foreground/70'}`}>
          {isFromOpenClaw ? '🧊 OpenClaw' : '🤖 FlowPilot'} · {formatDistanceToNow(new Date(exchange.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

export default function OpenClawPage() {
  const { data: sessions, isLoading: sessionsLoading } = useBetaTestSessions();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const { data: findings } = useBetaTestFindings(selectedSessionId || undefined);
  const { data: exchanges } = useBetaTestExchanges(selectedSessionId || undefined);

  const allFindings = useBetaTestFindings();

  const stats = {
    total: sessions?.length || 0,
    running: sessions?.filter(s => s.status === 'running').length || 0,
    bugs: allFindings.data?.filter(f => f.type === 'bug').length || 0,
    suggestions: allFindings.data?.filter(f => f.type === 'suggestion').length || 0,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="OpenClaw Beta Tester"
          description="A2A beta testing — an external OpenClaw instance tests your site and exchanges learnings with FlowPilot"
        />

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Sessions', value: stats.total, icon: Clock },
            { label: 'Running', value: stats.running, icon: Loader2 },
            { label: 'Bugs Found', value: stats.bugs, icon: Bug },
            { label: 'Suggestions', value: stats.suggestions, icon: Lightbulb },
          ].map(s => (
            <Card key={s.label} className="border-border">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-3">
                  <s.icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bridge API Info */}
        <Card className="border-dashed border-muted-foreground/30 bg-muted/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start gap-3">
              <ArrowRightLeft className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Bridge API</p>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  POST /functions/v1/openclaw-bridge
                </code>
                <p className="mt-1 text-xs">
                  Actions: <code className="bg-muted px-1 rounded">start_session</code>{' '}
                  <code className="bg-muted px-1 rounded">end_session</code>{' '}
                  <code className="bg-muted px-1 rounded">report_finding</code>{' '}
                  <code className="bg-muted px-1 rounded">exchange</code>{' '}
                  <code className="bg-muted px-1 rounded">get_status</code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main content */}
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Session list */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Test Sessions</h3>
            {sessionsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : !sessions?.length ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 pb-4 text-center">
                  <p className="text-sm text-muted-foreground">No sessions yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Connect your OpenClaw instance to start testing
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[500px] pr-2">
                <div className="space-y-2">
                  {sessions.map(session => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      isSelected={selectedSessionId === session.id}
                      onSelect={() => setSelectedSessionId(
                        selectedSessionId === session.id ? null : session.id
                      )}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Detail panel */}
          <div>
            {selectedSessionId ? (
              <Tabs defaultValue="findings">
                <TabsList>
                  <TabsTrigger value="findings">
                    Findings ({findings?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="exchanges">
                    Exchanges ({exchanges?.length || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="findings" className="mt-4">
                  {findings?.length ? (
                    <div className="space-y-2">
                      {findings.map(f => <FindingRow key={f.id} finding={f} />)}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No findings for this session
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="exchanges" className="mt-4">
                  {exchanges?.length ? (
                    <div className="space-y-3">
                      {exchanges.map(e => <ExchangeBubble key={e.id} exchange={e} />)}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No exchanges yet
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <Card className="border-dashed h-64 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Select a session to view findings and exchanges
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
