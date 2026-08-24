import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { reportService } from '../services/reportService';
import {
  formatDuration,
  formatDateTime,
  formatPhoneNumber,
  formatCustomerName,
  formatCustomerStatus,
  getStatusVariant,
} from '../utils/formatters';

import PageContainer from '../components/layout/PageContainer';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Toast from '../components/ui/Toast';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../components/ui/Table';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import ErrorMessage from '../components/common/ErrorMessage';

const REPORT_TABS = [
  { id: 'calls', label: 'Calls', icon: '☎' },
  { id: 'customers', label: 'Customers', icon: '👥' },
  { id: 'outcomes', label: 'Outcomes', icon: '✓' },
  { id: 'follow-ups', label: 'Follow-ups', icon: '◷' },
  { id: 'agents', label: 'Agent Performance', icon: '📊' },
  { id: 'audit-logs', label: 'Audit Logs', icon: '🛡' },
];

export const ReportsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState('calls');

  // Filter State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ start_date: undefined, end_date: undefined });
  const [dateError, setDateError] = useState('');

  // Data States
  const [summary, setSummary] = useState(null);
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch Summary and Active Report Data
  useEffect(() => {
    let isMounted = true;

    const fetchReports = async () => {
      try {
        setIsLoading(true);
        setError('');

        const params = {};
        if (appliedFilters.start_date) params.start_date = new Date(appliedFilters.start_date).toISOString();
        if (appliedFilters.end_date) {
          const endObj = new Date(appliedFilters.end_date);
          endObj.setHours(23, 59, 59, 999);
          params.end_date = endObj.toISOString();
        }

        // Fetch Summary
        const summaryData = await reportService.getReportSummary(params).catch(() => null);

        // Fetch Tab-Specific Data
        let data = [];
        if (activeTab === 'calls') {
          data = await reportService.getCallReport({ ...params, limit: 100 });
        } else if (activeTab === 'customers') {
          data = await reportService.getCustomerReport({ ...params, limit: 100 });
        } else if (activeTab === 'outcomes') {
          data = await reportService.getOutcomeReport({ ...params, limit: 100 });
        } else if (activeTab === 'follow-ups') {
          data = await reportService.getFollowUpReport({ ...params, limit: 100 });
        } else if (activeTab === 'agents') {
          data = await reportService.getAgentPerformanceReport(params);
        } else if (activeTab === 'audit-logs') {
          data = await reportService.getAuditReport({ ...params, limit: 100 });
        }

        if (isMounted) {
          setSummary(summaryData);
          setReportData(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to load report records. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchReports();

    return () => {
      isMounted = false;
    };
  }, [activeTab, appliedFilters, refreshTrigger]);

  const handleApplyFilters = (e) => {
    e.preventDefault();
    if (startDate && endDate && startDate > endDate) {
      setDateError('Start date cannot be later than end date.');
      return;
    }
    setDateError('');
    setAppliedFilters({
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    });
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setDateError('');
    setAppliedFilters({ start_date: undefined, end_date: undefined });
  };

  // CSV Export Handler
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const params = {};
      if (appliedFilters.start_date) params.start_date = new Date(appliedFilters.start_date).toISOString();
      if (appliedFilters.end_date) {
        const endObj = new Date(appliedFilters.end_date);
        endObj.setHours(23, 59, 59, 999);
        params.end_date = endObj.toISOString();
      }

      if (activeTab === 'calls') {
        await reportService.exportCallReport(params);
      } else if (activeTab === 'customers') {
        await reportService.exportCustomerReport(params);
      } else if (activeTab === 'outcomes') {
        await reportService.exportOutcomeReport(params);
      } else if (activeTab === 'follow-ups') {
        await reportService.exportFollowUpReport(params);
      } else if (activeTab === 'agents') {
        await reportService.exportAgentPerformanceReport(params);
      } else if (activeTab === 'audit-logs') {
        await reportService.exportAuditReport(params);
      }

      setToast({ message: `✓ ${activeTab.toUpperCase()} CSV exported successfully`, type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Unable to export this report. Please try again.', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const isFilterActive = !!(appliedFilters.start_date || appliedFilters.end_date);

  return (
    <PageContainer
      title="Reports"
      subtitle="Generate, filter, and export detailed call, outcome, customer, and agent activity records"
      actions={
        <div className="flex items-center gap-2.5">
          <Badge variant={isAdmin ? 'purple' : 'indigo'} size="md">
            {isAdmin ? 'Organization Reports' : 'My Reports'}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshTrigger((p) => p + 1)}
            disabled={isLoading || isExporting}
            className="shadow-xs"
          >
            <svg className="w-4 h-4 mr-1 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportCSV}
            isLoading={isExporting}
            disabled={isExporting || isLoading || reportData.length === 0}
            className="shadow-xs"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export CSV</span>
          </Button>
        </div>
      }
    >
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* Error Alert */}
      {error && (
        <ErrorMessage
          message={error}
          onRetry={() => setRefreshTrigger((p) => p + 1)}
          onDismiss={() => setError('')}
          className="mb-6"
        />
      )}

      {/* 1. Date Range Filters Card */}
      <div className="mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <form onSubmit={handleApplyFilters} className="flex flex-wrap items-center justify-between gap-3.5">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label htmlFor="start-date" className="block text-[11px] font-semibold text-slate-500 mb-1">
                Start Date
              </label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label htmlFor="end-date" className="block text-[11px] font-semibold text-slate-500 mb-1">
                End Date
              </label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="pt-5 flex items-center gap-2">
              <Button variant="primary" size="sm" type="submit" className="h-9 text-xs">
                Apply Range
              </Button>

              {isFilterActive && (
                <Button variant="outline" size="sm" onClick={handleClearFilters} className="h-9 text-xs">
                  Clear
                </Button>
              )}
            </div>
          </div>

          {isFilterActive && (
            <Badge variant="indigo" size="sm">
              Filtered: {appliedFilters.start_date || 'Earliest'} → {appliedFilters.end_date || 'Latest'}
            </Badge>
          )}
        </form>

        {dateError && (
          <p className="text-xs text-rose-600 font-medium mt-2">{dateError}</p>
        )}
      </div>

      {/* 2. Summary KPI Metrics Grid */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 block">Total Calls</span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">{summary.total_calls}</span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 block">Total Customers</span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">{summary.total_customers}</span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 block">Total Outcomes</span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">{summary.total_outcomes}</span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 block">Total Follow-ups</span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">{summary.total_follow_ups}</span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
            <span className="text-xs font-semibold text-slate-500 block">Total Duration</span>
            <span className="text-xl font-mono font-bold text-indigo-600 mt-1 block">
              {formatDuration(summary.total_duration_seconds)}
            </span>
          </div>
        </div>
      )}

      {/* 3. Report Tab Selector */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200 mb-6 overflow-x-auto">
        {REPORT_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Active Report Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight capitalize">
              {activeTab.replace('-', ' ')} Report
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {reportData.length} records {isFilterActive && '(Filtered by Date Range)'}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            isLoading={isExporting}
            disabled={isExporting || isLoading || reportData.length === 0}
            className="text-xs"
          >
            <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download CSV</span>
          </Button>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" />
            <p className="mt-3 text-xs font-medium text-slate-500">Loading {activeTab} data...</p>
          </div>
        ) : reportData.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={`No ${activeTab.replace('-', ' ')} data available`}
              description="Try selecting a wider date range or logging new activity."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* TAB 1: CALLS REPORT */}
            {activeTab === 'calls' && (
              <Table className="border-0 rounded-none shadow-none">
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>ID</TableHeaderCell>
                    <TableHeaderCell>Customer</TableHeaderCell>
                    <TableHeaderCell>Phone</TableHeaderCell>
                    <TableHeaderCell>Agent</TableHeaderCell>
                    <TableHeaderCell>Direction</TableHeaderCell>
                    <TableHeaderCell>Platform</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Duration</TableHeaderCell>
                    <TableHeaderCell>Started At</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.map((row) => (
                    <TableRow key={row.call_id} className="hover:bg-slate-50">
                      <TableCell><span className="font-mono font-bold text-xs text-slate-500">#{row.call_id}</span></TableCell>
                      <TableCell><span className="font-semibold text-slate-900">{row.customer_name}</span></TableCell>
                      <TableCell><span className="font-mono text-xs text-slate-600">{formatPhoneNumber(row.customer_phone)}</span></TableCell>
                      <TableCell><span className="text-xs text-slate-700">{row.agent_name}</span></TableCell>
                      <TableCell><Badge variant={row.direction === 'outgoing' ? 'blue' : 'indigo'} size="sm">{row.direction?.toUpperCase()}</Badge></TableCell>
                      <TableCell><span className="text-xs capitalize">{row.platform}</span></TableCell>
                      <TableCell><Badge variant={getStatusVariant(row.status)} size="sm">{row.status}</Badge></TableCell>
                      <TableCell><span className="font-mono text-xs font-semibold">{formatDuration(row.duration_seconds)}</span></TableCell>
                      <TableCell><span className="text-xs text-slate-500">{formatDateTime(row.started_at || row.created_at)}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* TAB 2: CUSTOMERS REPORT */}
            {activeTab === 'customers' && (
              <Table className="border-0 rounded-none shadow-none">
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>ID</TableHeaderCell>
                    <TableHeaderCell>Customer Name</TableHeaderCell>
                    <TableHeaderCell>Phone Number</TableHeaderCell>
                    <TableHeaderCell>Email</TableHeaderCell>
                    <TableHeaderCell>Company</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Created At</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.map((row) => {
                    const statusInfo = formatCustomerStatus(row.is_active);
                    return (
                      <TableRow key={row.customer_id} className="hover:bg-slate-50">
                        <TableCell><span className="font-mono font-bold text-xs text-slate-500">#{row.customer_id}</span></TableCell>
                        <TableCell><span className="font-semibold text-slate-900">{formatCustomerName(row.name)}</span></TableCell>
                        <TableCell><span className="font-mono text-xs text-slate-600">{formatPhoneNumber(row.phone)}</span></TableCell>
                        <TableCell><span className="text-xs text-slate-600">{row.email || '—'}</span></TableCell>
                        <TableCell><span className="text-xs font-medium text-slate-700">{row.company || '—'}</span></TableCell>
                        <TableCell><Badge variant={statusInfo.variant} size="sm">{statusInfo.label}</Badge></TableCell>
                        <TableCell><span className="text-xs text-slate-500">{formatDateTime(row.created_at)}</span></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {/* TAB 3: OUTCOMES REPORT */}
            {activeTab === 'outcomes' && (
              <Table className="border-0 rounded-none shadow-none">
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Outcome ID</TableHeaderCell>
                    <TableHeaderCell>Call Ref</TableHeaderCell>
                    <TableHeaderCell>Customer</TableHeaderCell>
                    <TableHeaderCell>Agent</TableHeaderCell>
                    <TableHeaderCell>Outcome</TableHeaderCell>
                    <TableHeaderCell>Notes</TableHeaderCell>
                    <TableHeaderCell>Created At</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.map((row) => (
                    <TableRow key={row.outcome_id} className="hover:bg-slate-50">
                      <TableCell><span className="font-mono font-bold text-xs text-slate-500">#{row.outcome_id}</span></TableCell>
                      <TableCell><span className="font-mono font-semibold text-indigo-600 text-xs">Call #{row.call_id}</span></TableCell>
                      <TableCell><span className="font-semibold text-slate-900">{row.customer_name}</span></TableCell>
                      <TableCell><span className="text-xs text-slate-700">{row.agent_name}</span></TableCell>
                      <TableCell><Badge variant={getStatusVariant(row.outcome)} size="sm">{row.outcome}</Badge></TableCell>
                      <TableCell><span className="text-xs text-slate-600 line-clamp-1">{row.notes || '—'}</span></TableCell>
                      <TableCell><span className="text-xs text-slate-500">{formatDateTime(row.created_at)}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* TAB 4: FOLLOW-UPS REPORT */}
            {activeTab === 'follow-ups' && (
              <Table className="border-0 rounded-none shadow-none">
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Task ID</TableHeaderCell>
                    <TableHeaderCell>Call Ref</TableHeaderCell>
                    <TableHeaderCell>Customer</TableHeaderCell>
                    <TableHeaderCell>Assigned User</TableHeaderCell>
                    <TableHeaderCell>Task Type</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Scheduled At</TableHeaderCell>
                    <TableHeaderCell>Completed At</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.map((row) => (
                    <TableRow key={row.follow_up_id} className="hover:bg-slate-50">
                      <TableCell><span className="font-mono font-bold text-xs text-slate-500">#{row.follow_up_id}</span></TableCell>
                      <TableCell><span className="font-mono font-semibold text-indigo-600 text-xs">Call #{row.call_id}</span></TableCell>
                      <TableCell><span className="font-semibold text-slate-900">{row.customer_name}</span></TableCell>
                      <TableCell><span className="text-xs text-slate-700">{row.assigned_user_name}</span></TableCell>
                      <TableCell><span className="text-xs capitalize font-medium">{row.follow_up_type}</span></TableCell>
                      <TableCell><Badge variant={getStatusVariant(row.status)} size="sm">{row.status}</Badge></TableCell>
                      <TableCell><span className="text-xs font-semibold text-slate-800">{formatDateTime(row.scheduled_at)}</span></TableCell>
                      <TableCell><span className="text-xs text-slate-500">{row.completed_at ? formatDateTime(row.completed_at) : '—'}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* TAB 5: AGENTS REPORT */}
            {activeTab === 'agents' && (
              <Table className="border-0 rounded-none shadow-none">
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Agent Name</TableHeaderCell>
                    <TableHeaderCell>Email</TableHeaderCell>
                    <TableHeaderCell>Total Calls</TableHeaderCell>
                    <TableHeaderCell>Incoming</TableHeaderCell>
                    <TableHeaderCell>Outgoing</TableHeaderCell>
                    <TableHeaderCell>Completed</TableHeaderCell>
                    <TableHeaderCell>Total Duration</TableHeaderCell>
                    <TableHeaderCell>Avg Duration</TableHeaderCell>
                    <TableHeaderCell>Outcomes</TableHeaderCell>
                    <TableHeaderCell>Follow-ups</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.map((row) => (
                    <TableRow key={row.agent_id} className="hover:bg-slate-50">
                      <TableCell><span className="font-semibold text-slate-900">{row.agent_name}</span></TableCell>
                      <TableCell><span className="text-xs text-slate-500">{row.agent_email}</span></TableCell>
                      <TableCell><span className="font-bold text-slate-900">{row.total_calls}</span></TableCell>
                      <TableCell><span className="text-indigo-600 font-semibold text-xs">{row.incoming_calls}</span></TableCell>
                      <TableCell><span className="text-blue-600 font-semibold text-xs">{row.outgoing_calls}</span></TableCell>
                      <TableCell><Badge variant="green" size="sm">{row.completed_calls}</Badge></TableCell>
                      <TableCell><span className="font-mono text-xs font-semibold">{formatDuration(row.total_duration_seconds)}</span></TableCell>
                      <TableCell><span className="font-mono text-xs text-slate-600">{formatDuration(row.average_duration_seconds)}</span></TableCell>
                      <TableCell><span className="text-xs font-semibold">{row.outcomes_recorded}</span></TableCell>
                      <TableCell><span className="text-xs font-semibold text-amber-700">{row.follow_ups_assigned}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* TAB 6: AUDIT LOGS REPORT */}
            {activeTab === 'audit-logs' && (
              <Table className="border-0 rounded-none shadow-none">
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Audit ID</TableHeaderCell>
                    <TableHeaderCell>User</TableHeaderCell>
                    <TableHeaderCell>Action</TableHeaderCell>
                    <TableHeaderCell>Entity Type</TableHeaderCell>
                    <TableHeaderCell>Entity ID</TableHeaderCell>
                    <TableHeaderCell>Description / Justification</TableHeaderCell>
                    <TableHeaderCell>Logged At</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.map((row) => (
                    <TableRow key={row.audit_id} className="hover:bg-slate-50">
                      <TableCell><span className="font-mono font-bold text-xs text-slate-500">#{row.audit_id}</span></TableCell>
                      <TableCell><span className="font-semibold text-slate-900">{row.user_name}</span></TableCell>
                      <TableCell><Badge variant="purple" size="sm">{row.action}</Badge></TableCell>
                      <TableCell><Badge variant="gray" size="sm">{row.entity_type}</Badge></TableCell>
                      <TableCell><span className="font-mono text-xs text-slate-700">#{row.entity_id}</span></TableCell>
                      <TableCell><span className="text-xs text-slate-700 max-w-xs line-clamp-2">{row.description}</span></TableCell>
                      <TableCell><span className="text-xs text-slate-500">{formatDateTime(row.created_at)}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default ReportsPage;
