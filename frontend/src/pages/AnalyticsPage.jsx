import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { analyticsService } from '../services/analyticsService';
import { formatDuration, formatDateTime, getStatusVariant } from '../utils/formatters';

import PageContainer from '../components/layout/PageContainer';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../components/ui/Table';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import ErrorMessage from '../components/common/ErrorMessage';

const OUTCOME_CONFIG = {
  interested: { label: 'Interested', color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  follow_up_required: { label: 'Follow-up Required', color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  callback_requested: { label: 'Callback Requested', color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
  converted: { label: 'Converted', color: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50' },
  not_interested: { label: 'Not Interested', color: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50' },
  no_response: { label: 'No Response', color: 'bg-slate-400', text: 'text-slate-700', bg: 'bg-slate-100' },
};

const TYPE_ICONS = {
  callback: '☎ Callback',
  email: '✉ Email',
  demo: '💻 Demo',
  meeting: '📅 Meeting',
  whatsapp: '💬 WhatsApp',
  other: '📝 Other',
};

export const AnalyticsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchAnalytics = async () => {
      try {
        if (!analytics) setIsLoading(true);
        else setIsRefreshing(true);
        setError('');

        const data = await analyticsService.getAnalyticsOverview();
        if (isMounted) {
          setAnalytics(data);
          setLastRefreshed(new Date().toISOString());
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to load analytics data. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    fetchAnalytics();

    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const callSummary = analytics?.call_summary || {
    total_calls: 0,
    incoming_calls: 0,
    outgoing_calls: 0,
    status_breakdown: {},
    total_duration_seconds: 0,
    avg_duration_seconds: 0,
    incoming_total_duration_seconds: 0,
    incoming_avg_duration_seconds: 0,
    outgoing_total_duration_seconds: 0,
    outgoing_avg_duration_seconds: 0,
  };

  const outcomeSummary = analytics?.outcome_summary || {
    total_outcomes: 0,
    outcome_breakdown: {},
  };

  const followUpSummary = analytics?.follow_up_summary || {
    total_follow_ups: 0,
    status_breakdown: {},
    type_breakdown: {},
  };

  const agentPerformance = analytics?.agent_performance || [];

  // Safe percentage calculations
  const totalCalls = callSummary.total_calls || 0;
  const incomingCalls = callSummary.incoming_calls || 0;
  const outgoingCalls = callSummary.outgoing_calls || 0;

  const incomingPct = totalCalls > 0 ? Math.round((incomingCalls / totalCalls) * 100) : 0;
  const outgoingPct = totalCalls > 0 ? Math.round((outgoingCalls / totalCalls) * 100) : 0;

  const completedCalls = callSummary.status_breakdown?.completed || 0;
  const completionRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;

  const hasData = totalCalls > 0 || outcomeSummary.total_outcomes > 0 || followUpSummary.total_follow_ups > 0;

  return (
    <PageContainer
      title="Analytics"
      subtitle="Call activity, duration distribution, outcome conversions, and agent performance insights"
      actions={
        <div className="flex items-center gap-2.5">
          <Badge variant={isAdmin ? 'purple' : 'indigo'} size="md">
            {isAdmin ? 'Organization Analytics' : 'My Analytics'}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            isLoading={isRefreshing}
            disabled={isRefreshing || isLoading}
            title="Refresh analytics metrics"
            className="shadow-xs"
          >
            <svg className="w-4 h-4 mr-1 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </Button>
        </div>
      }
    >
      {/* Last Refreshed Notice */}
      {lastRefreshed && (
        <div className="text-right text-[11px] text-slate-400 mb-4 -mt-2">
          Last updated: {formatDateTime(lastRefreshed)}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <ErrorMessage
          message={error}
          onRetry={handleRefresh}
          onDismiss={() => setError('')}
          className="mb-6"
        />
      )}

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" />
          <p className="mt-3 text-xs font-medium text-slate-500">Compiling call and performance analytics...</p>
        </div>
      ) : !hasData ? (
        <div className="p-8 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <EmptyState
            title="No call analytics available yet"
            description="Log and complete calls, record outcomes, or schedule follow-up tasks to generate performance charts."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* 1. Summary KPI Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Calls */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Calls</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                  ☎
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{totalCalls}</span>
                <span className="text-xs text-slate-400 font-medium">logged</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Completed: <strong>{completedCalls}</strong></span>
                <Badge variant="green" size="sm">{completionRate}% Rate</Badge>
              </div>
            </div>

            {/* Total Duration */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Duration</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                  ⏱
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 font-mono">
                  {formatDuration(callSummary.total_duration_seconds)}
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Avg Call: <strong className="font-mono">{formatDuration(callSummary.avg_duration_seconds)}</strong></span>
                <Badge variant="blue" size="sm">Talk Time</Badge>
              </div>
            </div>

            {/* Outcome Conversions */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Recorded Outcomes</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                  ✓
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{outcomeSummary.total_outcomes}</span>
                <span className="text-xs text-slate-400 font-medium">interactions</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Interested: <strong>{outcomeSummary.outcome_breakdown?.interested || 0}</strong></span>
                <Badge variant="green" size="sm">
                  {outcomeSummary.outcome_breakdown?.converted || 0} Converted
                </Badge>
              </div>
            </div>

            {/* Follow-up Queue */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Follow-up Pipeline</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
                  ◷
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{followUpSummary.total_follow_ups}</span>
                <span className="text-xs text-slate-400 font-medium">scheduled</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Pending: <strong>{followUpSummary.status_breakdown?.pending || 0}</strong></span>
                <Badge variant="amber" size="sm">Active Tasks</Badge>
              </div>
            </div>
          </div>

          {/* 2. Visual Distributions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Direction Analytics */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Call Direction Distribution</h3>
                  <span className="text-xs text-slate-400">{totalCalls} Total Calls</span>
                </div>

                <div className="mt-5 space-y-4">
                  {/* Incoming */}
                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="text-indigo-600 font-bold">↙</span> Incoming Calls
                      </span>
                      <span><strong>{incomingCalls}</strong> ({incomingPct}%)</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${incomingPct}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Avg: {formatDuration(callSummary.incoming_avg_duration_seconds)} • Total: {formatDuration(callSummary.incoming_total_duration_seconds)}
                    </span>
                  </div>

                  {/* Outgoing */}
                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="text-blue-600 font-bold">↗</span> Outgoing Calls
                      </span>
                      <span><strong>{outgoingCalls}</strong> ({outgoingPct}%)</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${outgoingPct}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Avg: {formatDuration(callSummary.outgoing_avg_duration_seconds)} • Total: {formatDuration(callSummary.outgoing_total_duration_seconds)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Call Status Breakdown</h3>
                <span className="text-xs text-slate-400">By Telephony Events</span>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {Object.entries(callSummary.status_breakdown || {}).map(([st, count]) => {
                  const pct = totalCalls > 0 ? Math.round((count / totalCalls) * 100) : 0;
                  return (
                    <div key={st} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-left">
                      <Badge variant={getStatusVariant(st)} size="sm">
                        {st.toUpperCase()}
                      </Badge>
                      <div className="mt-2 font-bold text-base text-slate-900">{count}</div>
                      <span className="text-[11px] text-slate-400">{pct}% of total</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Outcomes & Follow-up Types Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Outcome Conversion Breakdown */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Recorded Outcomes & Conversions</h3>
                <Badge variant="green" size="sm">{outcomeSummary.total_outcomes} Outcomes</Badge>
              </div>

              <div className="mt-4 space-y-2.5">
                {Object.entries(outcomeSummary.outcome_breakdown || {}).length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No outcome results recorded yet.</p>
                ) : (
                  Object.entries(outcomeSummary.outcome_breakdown || {}).map(([key, count]) => {
                    const cfg = OUTCOME_CONFIG[key] || { label: key, text: 'text-slate-700', bg: 'bg-slate-50', color: 'bg-slate-400' };
                    const totalOutcomes = outcomeSummary.total_outcomes || 1;
                    const pct = Math.round((count / totalOutcomes) * 100);

                    return (
                      <div key={key} className="p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${cfg.color}`} />
                          <span className="font-semibold text-slate-800">{cfg.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900">{count}</span>
                          <span className="text-slate-400 text-[11px] w-10 text-right">{pct}%</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Follow-up Type Distribution */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Follow-up Task Types</h3>
                <Badge variant="amber" size="sm">{followUpSummary.total_follow_ups} Tasks</Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {Object.entries(followUpSummary.type_breakdown || {}).length === 0 ? (
                  <p className="text-xs text-slate-400 col-span-3 py-6 text-center">No scheduled follow-up tasks.</p>
                ) : (
                  Object.entries(followUpSummary.type_breakdown || {}).map(([typeKey, count]) => (
                    <div key={typeKey} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-left">
                      <span className="text-xs font-semibold text-slate-700 block">
                        {TYPE_ICONS[typeKey] || typeKey}
                      </span>
                      <div className="mt-2 font-bold text-base text-slate-900">{count}</div>
                      <span className="text-[11px] text-slate-400">Scheduled</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 4. Agent Performance Section (Admin / Team Level) */}
          {agentPerformance.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    {isAdmin ? 'Agent Performance Overview' : 'My Performance Statistics'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Call volumes, talk time, outcomes, and task allocation</p>
                </div>
                <Badge variant="purple" size="sm">
                  {agentPerformance.length} {agentPerformance.length === 1 ? 'Agent' : 'Agents'}
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <Table className="border-0 rounded-none shadow-none">
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Agent Name</TableHeaderCell>
                      <TableHeaderCell>Total Calls</TableHeaderCell>
                      <TableHeaderCell>Incoming / Outgoing</TableHeaderCell>
                      <TableHeaderCell>Completed</TableHeaderCell>
                      <TableHeaderCell>Total Duration</TableHeaderCell>
                      <TableHeaderCell>Avg Duration</TableHeaderCell>
                      <TableHeaderCell>Outcomes</TableHeaderCell>
                      <TableHeaderCell className="text-right">Follow-ups</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {agentPerformance.map((ag, idx) => (
                      <TableRow
                        key={ag.agent_id}
                        className={`transition-colors hover:bg-indigo-50/20 ${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}
                      >
                        {/* Name */}
                        <TableCell>
                          <div className="font-semibold text-slate-900">{ag.agent_name}</div>
                          <div className="text-xs text-slate-400">{ag.agent_email}</div>
                        </TableCell>

                        {/* Total Calls */}
                        <TableCell>
                          <span className="font-bold text-slate-900">{ag.total_calls}</span>
                        </TableCell>

                        {/* In / Out */}
                        <TableCell>
                          <div className="text-xs text-slate-700">
                            <span className="text-indigo-600 font-semibold">{ag.incoming_calls} in</span> • <span className="text-blue-600 font-semibold">{ag.outgoing_calls} out</span>
                          </div>
                        </TableCell>

                        {/* Completed */}
                        <TableCell>
                          <Badge variant="green" size="sm">
                            {ag.completed_calls}
                          </Badge>
                        </TableCell>

                        {/* Total Duration */}
                        <TableCell>
                          <span className="font-mono text-xs font-semibold text-slate-800">
                            {formatDuration(ag.total_duration_seconds)}
                          </span>
                        </TableCell>

                        {/* Avg Duration */}
                        <TableCell>
                          <span className="font-mono text-xs text-slate-600">
                            {formatDuration(ag.avg_duration_seconds)}
                          </span>
                        </TableCell>

                        {/* Outcomes */}
                        <TableCell>
                          <span className="font-semibold text-slate-800">{ag.outcomes_recorded}</span>
                        </TableCell>

                        {/* Follow-ups */}
                        <TableCell className="text-right">
                          <span className="font-semibold text-amber-700">{ag.follow_ups_assigned}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
};

export default AnalyticsPage;
