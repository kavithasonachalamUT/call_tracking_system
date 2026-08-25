import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { dashboardService } from '../services/dashboardService';
import { callService } from '../services/callService';
import { auditService } from '../services/auditService';
import {
  formatDuration,
  formatDateTime,
  formatPhoneNumber,
  getStatusVariant,
} from '../utils/formatters';
import { getDashboardTitle, isAdmin, isManager } from '../utils/permissions';

import PageContainer from '../components/layout/PageContainer';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../components/ui/Table';
import CallStatusBadge from '../components/ui/CallStatusBadge';
import CallOutcomeDropdown from '../components/ui/CallOutcomeDropdown';
import CallFilterBar from '../components/ui/CallFilterBar';
import AdminStatusOverrideModal from '../components/ui/AdminStatusOverrideModal';
import Toast from '../components/ui/Toast';
import EmptyState from '../components/common/EmptyState';
import ErrorMessage from '../components/common/ErrorMessage';

export const DashboardPage = () => {
  const { user } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();

  // URL-persisted filter state
  const statusFilter = searchParams.get('status') || 'all';
  const directionFilter = searchParams.get('direction') || 'all';
  const outcomeFilter = searchParams.get('outcome') || 'all';

  const [overview, setOverview] = useState(null);
  const [activity, setActivity] = useState([]);
  const [notifSummary, setNotifSummary] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [toast, setToast] = useState(null);

  // Admin Override Modal State
  const [overrideCall, setOverrideCall] = useState(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);

  // Initial Data Fetch on Mount
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const [overviewData, activityData, notifData] = await Promise.allSettled([
          dashboardService.getDashboardOverview(),
          dashboardService.getDashboardActivity(10),
          dashboardService.getNotificationSummary(),
        ]);

        if (!isMounted) return;

        let hasOverview = false;

        if (overviewData.status === 'fulfilled') {
          setOverview(overviewData.value);
          hasOverview = true;
        }

        if (activityData.status === 'fulfilled') {
          setActivity(activityData.value);
        }

        if (notifData.status === 'fulfilled') {
          setNotifSummary(notifData.value);
        }

        if (!hasOverview && overviewData.status === 'rejected') {
          setError(overviewData.reason?.message || 'Failed to load dashboard overview.');
        }

        setLastRefreshed(new Date());
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to load dashboard data. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Manual Refresh Handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError('');

    try {
      const [overviewData, activityData, notifData] = await Promise.allSettled([
        dashboardService.getDashboardOverview(),
        dashboardService.getDashboardActivity(10),
        dashboardService.getNotificationSummary(),
      ]);

      let hasOverview = false;

      if (overviewData.status === 'fulfilled') {
        setOverview(overviewData.value);
        hasOverview = true;
      }

      if (activityData.status === 'fulfilled') {
        setActivity(activityData.value);
      }

      if (notifData.status === 'fulfilled') {
        setNotifSummary(notifData.value);
      }

      if (!hasOverview && overviewData.status === 'rejected') {
        throw new Error(overviewData.reason?.message || 'Failed to load dashboard overview.');
      }

      setLastRefreshed(new Date());
    } catch (err) {
      setError(err.message || 'Unable to refresh dashboard data. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter Update Handlers
  const handleStatusFilterChange = (val) => {
    const nextParams = new URLSearchParams(searchParams);
    if (val && val !== 'all') {
      nextParams.set('status', val);
    } else {
      nextParams.delete('status');
    }
    setSearchParams(nextParams);
  };

  const handleDirectionFilterChange = (val) => {
    const nextParams = new URLSearchParams(searchParams);
    if (val && val !== 'all') {
      nextParams.set('direction', val);
    } else {
      nextParams.delete('direction');
    }
    setSearchParams(nextParams);
  };

  const handleOutcomeFilterChange = (val) => {
    const nextParams = new URLSearchParams(searchParams);
    if (val && val !== 'all') {
      nextParams.set('outcome', val);
    } else {
      nextParams.delete('outcome');
    }
    setSearchParams(nextParams);
  };

  const handleClearFilters = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('status');
    nextParams.delete('direction');
    nextParams.delete('outcome');
    setSearchParams(nextParams);
  };

  // Outcome Change Handler with Toast notification & Audit Log
  const handleOutcomeUpdate = async (callId, newOutcome) => {
    try {
      await callService.recordCallOutcome(callId, newOutcome, 'Updated via dashboard');

      setOverview((prev) => {
        if (!prev) return prev;
        const updatedCalls = prev.recent_calls.map((c) =>
          c.call_id === callId ? { ...c, outcome: newOutcome } : c
        );
        return { ...prev, recent_calls: updatedCalls };
      });

      try {
        await auditService.createAuditLog({
          action: 'update',
          entity_type: 'call_outcome',
          entity_id: callId,
          description: `Call outcome set to '${newOutcome}'`,
          new_values: newOutcome,
          user_id: user?.id,
        });
      } catch (auditErr) {
        console.warn('Audit logging error:', auditErr);
      }

      setToast({ message: '✓ Outcome updated successfully', type: 'success' });
    } catch (err) {
      setToast({ message: 'Unable to update outcome. Please try again.', type: 'error' });
      throw err;
    }
  };

  // Admin Override Trigger
  const handleOpenOverrideModal = (call) => {
    setOverrideCall(call);
    setIsOverrideModalOpen(true);
  };

  // Submit Admin Status Override
  const handleSubmitStatusOverride = async (call, newStatus, reason) => {
    try {
      await callService.updateCallStatus(call.call_id, newStatus);

      try {
        await auditService.createAuditLog({
          action: 'status_change',
          entity_type: 'call',
          entity_id: call.call_id,
          description: `Manual admin status override: ${reason}`,
          old_values: call.status,
          new_values: newStatus,
          user_id: user?.id,
        });
      } catch (auditErr) {
        console.warn('Audit logging error:', auditErr);
      }

      setOverview((prev) => {
        if (!prev) return prev;
        const updatedCalls = prev.recent_calls.map((c) =>
          c.call_id === call.call_id ? { ...c, status: newStatus } : c
        );
        return { ...prev, recent_calls: updatedCalls };
      });

      setToast({ message: '✓ Status override recorded & logged in Audit Logs', type: 'success' });
    } catch (err) {
      setToast({ message: 'Failed to override status. Please try again.', type: 'error' });
      throw err;
    }
  };

  const summary = overview?.summary || {
    total_calls: 0,
    incoming_calls: 0,
    outgoing_calls: 0,
    completed_calls: 0,
    missed_calls: 0,
    failed_calls: 0,
    ongoing_calls: 0,
    total_duration_seconds: 0,
    avg_duration_seconds: 0,
  };

  const rawCalls = useMemo(() => overview?.recent_calls || [], [overview]);
  const upcomingFollowUps = overview?.upcoming_follow_ups || [];
  const recentOutcomes = overview?.recent_outcomes || [];
  const unreadCount = notifSummary?.unread_count ?? 0;
  const missedAndFailed = summary.missed_calls + summary.failed_calls;

  // Filtered Calls using AND logic across active filter chips
  const filteredCalls = useMemo(() => {
    return rawCalls.filter((call) => {
      // 1. Status Filter
      if (statusFilter !== 'all') {
        const callStatus = (call.status || '').toLowerCase();
        if (statusFilter === 'completed' && callStatus !== 'completed') return false;
        if (statusFilter === 'initiated' && callStatus !== 'initiated' && callStatus !== 'ringing') return false;
        if (statusFilter === 'ongoing' && callStatus !== 'ongoing') return false;
        if (statusFilter === 'failed' && callStatus !== 'failed' && callStatus !== 'missed') return false;
        if (statusFilter === 'cancelled' && callStatus !== 'cancelled') return false;
      }

      // 2. Direction Filter
      if (directionFilter !== 'all') {
        if ((call.direction || '').toLowerCase() !== directionFilter.toLowerCase()) {
          return false;
        }
      }

      // 3. Outcome Filter
      if (outcomeFilter !== 'all') {
        if (outcomeFilter === 'pending') {
          if (call.outcome) return false;
        } else {
          if ((call.outcome || '').toLowerCase() !== outcomeFilter.toLowerCase()) {
            return false;
          }
        }
      }

      return true;
    });
  }, [rawCalls, statusFilter, directionFilter, outcomeFilter]);

  const isFiltered = statusFilter !== 'all' || directionFilter !== 'all' || outcomeFilter !== 'all';

  // Loading Skeleton State
  if (isLoading && !overview) {
    return (
      <PageContainer
        title="Dashboard Overview"
        subtitle="Loading metrics and call logs..."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-3.5 bg-slate-200 rounded-md w-24" />
                <div className="w-8 h-8 rounded-xl bg-slate-100" />
              </div>
              <div className="mt-4 h-8 bg-slate-200 rounded-md w-16" />
              <div className="mt-3 h-3 bg-slate-100 rounded-md w-32" />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 animate-pulse">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="h-4 bg-slate-200 rounded-md w-32" />
            <div className="h-4 bg-slate-100 rounded-md w-16" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-slate-50 rounded-lg w-full" />
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={getDashboardTitle(user)}
      subtitle={
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-500">
          <span>
            Welcome back, <strong className="font-semibold text-slate-800">{user?.name || 'User'}</strong>
          </span>
          <span className="hidden sm:inline text-slate-300">•</span>
          <span className={`px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider text-[10px] ${
            isAdmin(user)
              ? 'bg-purple-50 text-purple-700 border border-purple-200'
              : isManager(user)
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
          }`}>
            {isAdmin(user) ? 'Admin Access' : isManager(user) ? 'Manager Access' : 'Agent Access'}
          </span>
          {lastRefreshed && (
            <>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="text-[11px] text-slate-400">
                Updated: {formatDateTime(lastRefreshed)}
              </span>
            </>
          )}
        </div>
      }
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="shadow-xs"
        >
          <svg
            className={`w-4 h-4 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
        </Button>
      }
    >
      {/* Error Alert with Retry */}
      {error && (
        <ErrorMessage
          message={error}
          onRetry={handleRefresh}
          onDismiss={() => setError('')}
          className="mb-5"
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* Admin Status Override Modal */}
      <AdminStatusOverrideModal
        isOpen={isOverrideModalOpen}
        onClose={() => {
          setIsOverrideModalOpen(false);
          setOverrideCall(null);
        }}
        call={overrideCall}
        onSubmitOverride={handleSubmitStatusOverride}
      />

      {/* 1. Summary Metrics Grid (Calculated from automatic telephony status) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 mb-6">
        {/* Total Calls */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Calls</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">{summary.total_calls}</div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <span>In: <strong className="font-semibold text-slate-800">{summary.incoming_calls}</strong></span>
            <span className="text-slate-300">•</span>
            <span>Out: <strong className="font-semibold text-slate-800">{summary.outgoing_calls}</strong></span>
          </div>
        </div>

        {/* Completed Calls & Duration */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Completed Calls</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div className={`mt-2 text-3xl ${summary.completed_calls > 0 ? 'font-extrabold text-emerald-600' : 'font-semibold text-slate-400'}`}>
            {summary.completed_calls}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Avg Duration: <strong className="font-semibold text-slate-800">{formatDuration(summary.avg_duration_seconds)}</strong>
          </div>
        </div>

        {/* Missed / Failed Calls (De-emphasized when 0) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Missed & Failed</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${missedAndFailed > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
              </svg>
            </div>
          </div>
          <div className={`mt-2 text-3xl ${missedAndFailed > 0 ? 'font-extrabold text-rose-600' : 'font-semibold text-slate-400'}`}>
            {missedAndFailed}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <span>Missed: <strong className="font-semibold text-slate-800">{summary.missed_calls}</strong></span>
            <span className="text-slate-300">•</span>
            <span>Failed: <strong className="font-semibold text-slate-800">{summary.failed_calls}</strong></span>
          </div>
        </div>

        {/* Upcoming Follow-ups & Unread Alerts (De-emphasized when 0) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Follow-ups & Alerts</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${upcomingFollowUps.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className={`mt-2 text-3xl ${upcomingFollowUps.length > 0 ? 'font-extrabold text-amber-600' : 'font-semibold text-slate-400'}`}>
            {upcomingFollowUps.length}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Unread Notifications:{' '}
            <strong className={`font-semibold ${unreadCount > 0 ? 'text-indigo-600' : 'text-slate-800'}`}>
              {unreadCount}
            </strong>
          </div>
        </div>
      </div>

      {/* 2. Recent Calls Table: Dynamic Top-Level Filter Controls */}
      <div className="mb-6 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Card Title Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              {isAdmin(user) ? 'Organization Recent Calls' : isManager(user) ? 'Team Recent Calls' : 'My Recent Calls'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Click Outcome to update call details</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={isFiltered ? 'purple' : 'gray'} size="sm">
              {isFiltered ? `${filteredCalls.length} of ${rawCalls.length} Calls` : `${rawCalls.length} ${rawCalls.length === 1 ? 'Call' : 'Calls'}`}
            </Badge>
            <Link
              to={`/calls${searchParams.toString() ? `?${searchParams.toString()}` : ''}`}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500/20 rounded-md px-1 py-0.5 transition-all hidden sm:inline-flex items-center gap-1"
            >
              <span>View All Calls</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Dynamic Filter Controls Bar */}
        <CallFilterBar
          statusFilter={statusFilter}
          directionFilter={directionFilter}
          outcomeFilter={outcomeFilter}
          onStatusChange={handleStatusFilterChange}
          onDirectionChange={handleDirectionFilterChange}
          onOutcomeChange={handleOutcomeFilterChange}
          onClearFilters={handleClearFilters}
        />

        {filteredCalls.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={isFiltered ? 'No calls matching active filters' : 'No recent calls found'}
              description={
                isFiltered
                  ? 'Try adjusting or clearing your status, direction, or outcome filters.'
                  : 'No recent call activity is recorded in your current scope. Initiate your first call from the Calls module.'
              }
              action={
                isFiltered ? (
                  <Button variant="outline" size="sm" onClick={handleClearFilters}>
                    Clear All Filters
                  </Button>
                ) : (
                  <Link to="/calls">
                    <Button variant="primary" size="sm">
                      Go to Calls
                    </Button>
                  </Link>
                )
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="border-0 rounded-none shadow-none">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Customer</TableHeaderCell>
                  <TableHeaderCell>Agent</TableHeaderCell>
                  <TableHeaderCell>Direction</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Duration</TableHeaderCell>
                  <TableHeaderCell>Outcome</TableHeaderCell>
                  <TableHeaderCell>Call Time</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCalls.map((call, idx) => (
                  <TableRow
                    key={call.call_id}
                    className={`transition-colors hover:bg-indigo-50/20 ${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}
                  >
                    <TableCell>
                      <div className="font-semibold text-slate-900">{call.customer_name || 'Unknown Customer'}</div>
                      <div className="text-xs text-slate-500">{formatPhoneNumber(call.customer_phone)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-800">{call.agent_name || 'Unassigned'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={call.direction === 'outgoing' ? 'blue' : 'indigo'} size="sm">
                        {call.direction?.toUpperCase() || 'CALL'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <CallStatusBadge
                        status={call.status}
                        call={call}
                        isAdmin={isAdmin(user)}
                        onOpenOverride={handleOpenOverrideModal}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-slate-700">{formatDuration(call.duration_seconds)}</span>
                    </TableCell>
                    <TableCell>
                      <CallOutcomeDropdown
                        callId={call.call_id}
                        currentOutcome={call.outcome}
                        onOutcomeChange={handleOutcomeUpdate}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-500">{formatDateTime(call.start_time)}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* 3. Split Grid: Upcoming Follow-ups & Recent Outcomes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Upcoming Follow-ups */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {isAdmin(user) ? 'Upcoming Follow-ups (Organization)' : isManager(user) ? 'Upcoming Follow-ups (Team)' : 'My Upcoming Follow-ups'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Scheduled customer tasks and reminders</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={upcomingFollowUps.length > 0 ? 'amber' : 'gray'} size="sm">
                {upcomingFollowUps.length} Pending
              </Badge>
              <Link
                to="/follow-ups"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-colors hidden sm:inline"
              >
                View All
              </Link>
            </div>
          </div>

          <div className="p-4 flex-1">
            {upcomingFollowUps.length === 0 ? (
              <EmptyState
                title="No upcoming follow-ups"
                description="There are currently no scheduled follow-up tasks."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {upcomingFollowUps.map((fu) => (
                  <div key={fu.follow_up_id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-sm text-slate-900">{fu.customer_name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Assigned: <span className="font-medium text-slate-700">{fu.assigned_user_name}</span>
                        </div>
                      </div>
                      <Badge variant={getStatusVariant(fu.status)} size="sm">
                        {fu.status}
                      </Badge>
                    </div>
                    {fu.notes && (
                      <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {fu.notes}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span className="capitalize text-slate-600 font-medium">Type: {fu.follow_up_type}</span>
                      <span className="text-indigo-600 font-semibold">{formatDateTime(fu.scheduled_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Outcomes */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Recent Call Outcomes</h2>
              <p className="text-xs text-slate-500 mt-0.5">Logged resolutions and sentiments</p>
            </div>
            <Badge variant={recentOutcomes.length > 0 ? 'green' : 'gray'} size="sm">
              {recentOutcomes.length} Logged
            </Badge>
          </div>

          <div className="p-4 flex-1">
            {recentOutcomes.length === 0 ? (
              <EmptyState
                title="No recent outcomes"
                description="No call outcomes have been recorded recently."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {recentOutcomes.map((outcome) => (
                  <div key={outcome.outcome_id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-sm text-slate-900">{outcome.customer_name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          By Agent: <span className="font-medium text-slate-700">{outcome.agent_name}</span>
                        </div>
                      </div>
                      <Badge variant={getStatusVariant(outcome.outcome)} size="sm">
                        {outcome.outcome}
                      </Badge>
                    </div>
                    {outcome.notes && (
                      <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {outcome.notes}
                      </p>
                    )}
                    <div className="mt-2 text-right text-xs text-slate-400">
                      {formatDateTime(outcome.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Recent Call Activity Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              {isAdmin(user) ? 'Live Organization Call Activity' : isManager(user) ? 'Live Team Call Activity' : 'My Live Call Activity'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Real-time timeline of telecommunications and engagements</p>
          </div>
          <Badge variant="blue" size="sm">
            {activity.length} Events
          </Badge>
        </div>

        <div className="p-4 sm:p-5">
          {activity.length === 0 ? (
            <EmptyState
              title="No recent activity"
              description="No live call activity is available at this time."
            />
          ) : (
            <div className="space-y-3">
              {activity.map((item) => (
                <div
                  key={item.call_id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      #{item.call_id}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                        <span>{item.customer_name}</span>
                        <span className="text-xs text-slate-400 font-normal">({formatPhoneNumber(item.customer_phone)})</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                        <span>Agent: <strong className="font-semibold text-slate-800">{item.agent_name}</strong></span>
                        <span>•</span>
                        <span>Duration: <strong className="font-mono font-semibold text-slate-800">{formatDuration(item.duration_seconds)}</strong></span>
                        {item.follow_up_count > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-amber-600 font-medium">{item.follow_up_count} Follow-up(s)</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 sm:self-center">
                    <Badge variant={item.direction === 'outgoing' ? 'blue' : 'indigo'} size="sm">
                      {item.direction}
                    </Badge>
                    <Badge variant={getStatusVariant(item.status)} size="sm">
                      {item.status}
                    </Badge>
                    <span className="text-xs text-slate-400 whitespace-nowrap pl-1">
                      {formatDateTime(item.started_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default DashboardPage;
