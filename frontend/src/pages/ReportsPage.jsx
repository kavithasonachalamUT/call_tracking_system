import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { reportService } from '../services/reportService';
import { userService } from '../services/userService';
import {
  formatReportDuration,
  formatReportDate,
  formatReportNumber,
  CALL_STATUS_LABELS,
  DIRECTION_LABELS,
  OUTCOME_LABELS,
  FOLLOW_UP_TYPE_LABELS,
} from '../utils/reportUtils';
import {
  formatPhoneNumber,
  formatCustomerName,
  getStatusVariant,
} from '../utils/formatters';
import { getRoleBadgeVariant, isAdmin, isManager, isAgent } from '../utils/permissions';

import PageContainer from '../components/layout/PageContainer';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Toast from '../components/ui/Toast';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../components/ui/Table';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import ErrorMessage from '../components/common/ErrorMessage';

const PAGE_SIZE = 10;

export const ReportsPage = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('calls');

  // Filter State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDirection, setSelectedDirection] = useState('all');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({});
  const [dateError, setDateError] = useState('');
  const [currentPage, setCurrentPage] = useState(0);

  // Reference Data
  const [agentsList, setAgentsList] = useState([]);

  // Data States
  const [summary, setSummary] = useState(null);
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const canFilterAgents = isAdmin(user) || isManager(user);

  // Available tabs based on role
  const availableTabs = [
    { id: 'calls', label: 'Calls', icon: '☎' },
    { id: 'customers', label: 'Customers', icon: '👥' },
    { id: 'outcomes', label: 'Outcomes', icon: '✓' },
    { id: 'follow-ups', label: 'Follow-ups', icon: '◷' },
    ...(!isAgent(user) ? [{ id: 'agents', label: 'Agent Performance', icon: '📊' }] : []),
    ...(isAdmin(user) ? [{ id: 'audit-logs', label: 'Audit Logs', icon: '🛡' }] : []),
  ];

  // Fetch agents list for Admin/Manager
  useEffect(() => {
    if (canFilterAgents) {
      userService.getUsers({ limit: 100 }).then(setAgentsList).catch(() => {});
    }
  }, [canFilterAgents]);

  // Fetch Summary and Active Report Data
  useEffect(() => {
    let isMounted = true;

    const fetchReports = async () => {
      try {
        setIsLoading(true);
        setError('');

        const params = {
          skip: currentPage * PAGE_SIZE,
          limit: PAGE_SIZE + 1,
        };

        if (appliedFilters.start_date) params.start_date = new Date(appliedFilters.start_date).toISOString();
        if (appliedFilters.end_date) {
          const endObj = new Date(appliedFilters.end_date);
          endObj.setHours(23, 59, 59, 999);
          params.end_date = endObj.toISOString();
        }
        if (appliedFilters.agent_id && appliedFilters.agent_id !== 'all' && canFilterAgents) {
          params.agent_id = parseInt(appliedFilters.agent_id, 10);
        }
        if (appliedFilters.status && appliedFilters.status !== 'all') {
          params.status = appliedFilters.status;
        }
        if (appliedFilters.direction && appliedFilters.direction !== 'all') {
          params.direction = appliedFilters.direction;
        }
        if (appliedFilters.platform && appliedFilters.platform !== 'all') {
          params.platform = appliedFilters.platform;
        }
        if (appliedFilters.search) {
          params.search = appliedFilters.search;
        }

        // Fetch Summary
        const summaryParams = {};
        if (params.start_date) summaryParams.start_date = params.start_date;
        if (params.end_date) summaryParams.end_date = params.end_date;
        const summaryData = await reportService.getReportSummary(summaryParams).catch(() => null);

        // Fetch Tab-Specific Data
        let data = [];
        if (activeTab === 'calls') {
          data = await reportService.getCallReport(params);
        } else if (activeTab === 'customers') {
          data = await reportService.getCustomerReport(params);
        } else if (activeTab === 'outcomes') {
          data = await reportService.getOutcomeReport(params);
        } else if (activeTab === 'follow-ups') {
          data = await reportService.getFollowUpReport(params);
        } else if (activeTab === 'agents') {
          data = await reportService.getAgentPerformanceReport(params);
        } else if (activeTab === 'audit-logs') {
          data = await reportService.getAuditReport(params);
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
  }, [activeTab, appliedFilters, currentPage, refreshTrigger, canFilterAgents]);

  const handleApplyFilters = (e) => {
    e.preventDefault();
    if (startDate && endDate && startDate > endDate) {
      setDateError('Start date cannot be later than end date.');
      return;
    }
    setDateError('');
    setCurrentPage(0);
    setAppliedFilters({
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      agent_id: selectedAgentId !== 'all' ? selectedAgentId : undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      direction: selectedDirection !== 'all' ? selectedDirection : undefined,
      platform: selectedPlatform !== 'all' ? selectedPlatform : undefined,
      search: searchTerm.trim() || undefined,
    });
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedAgentId('all');
    setSelectedStatus('all');
    setSelectedDirection('all');
    setSelectedPlatform('all');
    setSearchTerm('');
    setDateError('');
    setCurrentPage(0);
    setAppliedFilters({});
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
      if (appliedFilters.agent_id && appliedFilters.agent_id !== 'all' && canFilterAgents) {
        params.agent_id = parseInt(appliedFilters.agent_id, 10);
      }
      if (appliedFilters.status && appliedFilters.status !== 'all') {
        params.status = appliedFilters.status;
      }
      if (appliedFilters.direction && appliedFilters.direction !== 'all') {
        params.direction = appliedFilters.direction;
      }
      if (appliedFilters.platform && appliedFilters.platform !== 'all') {
        params.platform = appliedFilters.platform;
      }
      if (appliedFilters.search) {
        params.search = appliedFilters.search;
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

      setToast({ message: `✓ ${activeTab.toUpperCase().replace('-', ' ')} CSV exported successfully`, type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Unable to export this report. Please try again.', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const isFilterActive = Object.values(appliedFilters).some(Boolean);
  const displayedData = reportData.slice(0, PAGE_SIZE);
  const hasNextPage = reportData.length > PAGE_SIZE;

  // Role-aware Page Title & Subtitle
  const pageTitle = isAdmin(user)
    ? 'Organization Reports'
    : isManager(user)
    ? 'Team Reports'
    : 'My Reports';

  const pageSubtitle = isAdmin(user)
    ? 'Generate and export organization-wide call, customer, outcome, and agent reports'
    : isManager(user)
    ? 'Generate and export team call, customer, outcome, and performance reports'
    : 'Generate and export your personal call and task activity reports';

  return (
    <PageContainer
      title={pageTitle}
      subtitle={pageSubtitle}
      actions={
        <div className="flex items-center gap-2.5">
          <Badge variant={getRoleBadgeVariant(user?.role)} size="md">
            {isAdmin(user) ? 'ORGANIZATION SCOPE' : isManager(user) ? 'TEAM SCOPE' : 'PERSONAL SCOPE'}
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
            disabled={isExporting || isLoading || displayedData.length === 0}
            className="shadow-xs"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>{isExporting ? 'Exporting...' : `Export ${activeTab.replace('-', ' ').toUpperCase()} CSV`}</span>
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

      {/* 1. Filter Section */}
      <div className="mb-6 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <form onSubmit={handleApplyFilters} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Start Date */}
            <div>
              <label htmlFor="start-date" className="block text-[11px] font-semibold text-slate-500 mb-1">
                Start Date
              </label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* End Date */}
            <div>
              <label htmlFor="end-date" className="block text-[11px] font-semibold text-slate-500 mb-1">
                End Date
              </label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Agent Filter (Admin / Manager) */}
            {canFilterAgents && (
              <div>
                <label htmlFor="agent-filter" className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Agent
                </label>
                <select
                  id="agent-filter"
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                >
                  <option value="all">All Agents</option>
                  {agentsList.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Status Filter (Calls / Follow-ups) */}
            {(activeTab === 'calls' || activeTab === 'follow-ups') && (
              <div>
                <label htmlFor="status-filter" className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Status
                </label>
                <select
                  id="status-filter"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  {activeTab === 'calls' ? (
                    <>
                      <option value="initiated">Initiated</option>
                      <option value="ringing">Ringing</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="missed">Missed</option>
                      <option value="failed">Failed</option>
                      <option value="cancelled">Cancelled</option>
                    </>
                  ) : (
                    <>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </>
                  )}
                </select>
              </div>
            )}

            {/* Direction Filter (Calls) */}
            {activeTab === 'calls' && (
              <div>
                <label htmlFor="direction-filter" className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Direction
                </label>
                <select
                  id="direction-filter"
                  value={selectedDirection}
                  onChange={(e) => setSelectedDirection(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                >
                  <option value="all">All Directions</option>
                  <option value="incoming">Incoming</option>
                  <option value="outgoing">Outgoing</option>
                </select>
              </div>
            )}

            {/* Platform Filter (Calls) */}
            {activeTab === 'calls' && (
              <div>
                <label htmlFor="platform-filter" className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Platform
                </label>
                <select
                  id="platform-filter"
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                >
                  <option value="all">All Platforms</option>
                  <option value="twilio">Twilio</option>
                  <option value="plivo">Plivo</option>
                  <option value="exotel">Exotel</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            )}

            {/* Search (Calls / Customers) */}
            {(activeTab === 'calls' || activeTab === 'customers') && (
              <div>
                <label htmlFor="search-filter" className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Search Query
                </label>
                <input
                  id="search-filter"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search name, phone, notes..."
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" type="submit">
                Apply Filters
              </Button>

              {isFilterActive && (
                <Button variant="outline" size="sm" onClick={handleClearFilters}>
                  Reset
                </Button>
              )}
            </div>

            {isFilterActive && (
              <Badge variant="indigo" size="sm">
                Active Filter Applied
              </Badge>
            )}
          </div>
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
            <span className="text-xl font-bold text-slate-900 mt-1 block">{formatReportNumber(summary.total_calls)}</span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 block">Total Customers</span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">{formatReportNumber(summary.total_customers)}</span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 block">Total Outcomes</span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">{formatReportNumber(summary.total_outcomes)}</span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 block">Total Follow-ups</span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">{formatReportNumber(summary.total_follow_ups)}</span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
            <span className="text-xs font-semibold text-slate-500 block">Total Talk Time</span>
            <span className="text-xl font-mono font-bold text-indigo-600 mt-1 block">
              {formatReportDuration(summary.total_duration_seconds)}
            </span>
          </div>
        </div>
      )}

      {/* 3. Report Tab Selector */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200 mb-6 overflow-x-auto">
        {availableTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setCurrentPage(0);
              }}
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
              {activeTab.replace('-', ' ')} Report Records
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Page {currentPage + 1} • {displayedData.length} records shown {isFilterActive && '(Filtered)'}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            isLoading={isExporting}
            disabled={isExporting || isLoading || displayedData.length === 0}
            className="text-xs"
          >
            <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </Button>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" />
            <p className="mt-3 text-xs font-medium text-slate-500">Querying report records...</p>
          </div>
        ) : displayedData.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={isFilterActive ? 'No report records match your filters' : 'No records found'}
              description={
                isFilterActive
                  ? 'Try broadening your date range or clearing specific filter criteria.'
                  : `No ${activeTab.replace('-', ' ')} activity has been recorded yet.`
              }
              action={
                isFilterActive ? (
                  <Button variant="outline" size="sm" onClick={handleClearFilters}>
                    Reset Filters
                  </Button>
                ) : null
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table className="border-0 rounded-none shadow-none">
                {/* 1. Calls Table */}
                {activeTab === 'calls' && (
                  <>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>ID</TableHeaderCell>
                        <TableHeaderCell>Customer</TableHeaderCell>
                        <TableHeaderCell>Agent</TableHeaderCell>
                        <TableHeaderCell>Direction</TableHeaderCell>
                        <TableHeaderCell>Platform</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell>Duration</TableHeaderCell>
                        <TableHeaderCell className="text-right">Call Time</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {displayedData.map((row, idx) => (
                        <TableRow
                          key={row.call_id || idx}
                          className={`transition-colors hover:bg-indigo-50/20 ${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}
                        >
                          <TableCell>
                            <span className="font-mono text-xs font-bold text-slate-500">#{row.call_id}</span>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-slate-900">{formatCustomerName(row.customer_name) || `Customer #${row.customer_id}`}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{formatPhoneNumber(row.customer_phone || '')}</div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-slate-700">{row.agent_name || `Agent #${row.agent_id}`}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                              {DIRECTION_LABELS[row.direction] || row.direction}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs text-slate-600 uppercase">{row.platform}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(row.status)} size="sm">
                              {CALL_STATUS_LABELS[row.status] || row.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs font-semibold text-slate-800">
                              {formatReportDuration(row.duration_seconds)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-xs text-slate-500">{formatReportDate(row.started_at || row.created_at)}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </>
                )}

                {/* 2. Customers Table */}
                {activeTab === 'customers' && (
                  <>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>ID</TableHeaderCell>
                        <TableHeaderCell>Name</TableHeaderCell>
                        <TableHeaderCell>Phone</TableHeaderCell>
                        <TableHeaderCell>Email</TableHeaderCell>
                        <TableHeaderCell>Company</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell className="text-right">Created Date</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {displayedData.map((row, idx) => (
                        <TableRow
                          key={row.customer_id || idx}
                          className={`transition-colors hover:bg-indigo-50/20 ${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}
                        >
                          <TableCell>
                            <span className="font-mono text-xs font-bold text-slate-500">#{row.customer_id}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-slate-900">{formatCustomerName(row.name)}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs text-slate-600">{formatPhoneNumber(row.phone || '')}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-slate-600">{row.email || '—'}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-slate-600">{row.company || '—'}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={row.is_active ? 'green' : 'gray'} size="sm">
                              {row.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-xs text-slate-500">{formatReportDate(row.created_at)}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </>
                )}

                {/* 3. Outcomes Table */}
                {activeTab === 'outcomes' && (
                  <>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Outcome ID</TableHeaderCell>
                        <TableHeaderCell>Call Ref</TableHeaderCell>
                        <TableHeaderCell>Customer</TableHeaderCell>
                        <TableHeaderCell>Agent</TableHeaderCell>
                        <TableHeaderCell>Outcome</TableHeaderCell>
                        <TableHeaderCell>Notes</TableHeaderCell>
                        <TableHeaderCell className="text-right">Created At</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {displayedData.map((row, idx) => (
                        <TableRow
                          key={row.outcome_id || idx}
                          className={`transition-colors hover:bg-indigo-50/20 ${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}
                        >
                          <TableCell>
                            <span className="font-mono text-xs font-bold text-slate-500">#{row.outcome_id}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs text-indigo-600 font-semibold">Call #{row.call_id}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-slate-900">{formatCustomerName(row.customer_name) || `Customer #${row.customer_id}`}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-slate-700">{row.agent_name || `Agent #${row.agent_id}`}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={row.outcome === 'converted' || row.outcome === 'interested' ? 'green' : 'blue'} size="sm">
                              {OUTCOME_LABELS[row.outcome] || row.outcome}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-slate-600 line-clamp-1">{row.notes || '—'}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-xs text-slate-500">{formatReportDate(row.created_at)}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </>
                )}

                {/* 4. Follow-ups Table */}
                {activeTab === 'follow-ups' && (
                  <>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>ID</TableHeaderCell>
                        <TableHeaderCell>Customer</TableHeaderCell>
                        <TableHeaderCell>Assigned Agent</TableHeaderCell>
                        <TableHeaderCell>Type</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell>Scheduled</TableHeaderCell>
                        <TableHeaderCell className="text-right">Completed</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {displayedData.map((row, idx) => (
                        <TableRow
                          key={row.follow_up_id || idx}
                          className={`transition-colors hover:bg-indigo-50/20 ${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}
                        >
                          <TableCell>
                            <span className="font-mono text-xs font-bold text-slate-500">#{row.follow_up_id}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-slate-900">{formatCustomerName(row.customer_name) || `Customer #${row.customer_id}`}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-slate-700">{row.assigned_user_name || `Agent #${row.assigned_to}`}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-semibold text-slate-700">
                              {FOLLOW_UP_TYPE_LABELS[row.follow_up_type] || row.follow_up_type}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={row.status === 'completed' ? 'green' : row.status === 'cancelled' ? 'gray' : 'amber'} size="sm">
                              {row.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-slate-800 font-semibold">{formatReportDate(row.scheduled_at)}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-xs text-slate-500">{formatReportDate(row.completed_at)}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </>
                )}

                {/* 5. Agent Performance Table */}
                {activeTab === 'agents' && (
                  <>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Agent</TableHeaderCell>
                        <TableHeaderCell>Total Calls</TableHeaderCell>
                        <TableHeaderCell>Incoming / Outgoing</TableHeaderCell>
                        <TableHeaderCell>Completed</TableHeaderCell>
                        <TableHeaderCell>Talk Time</TableHeaderCell>
                        <TableHeaderCell>Avg Duration</TableHeaderCell>
                        <TableHeaderCell>Outcomes</TableHeaderCell>
                        <TableHeaderCell className="text-right">Follow-ups</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {displayedData.map((row, idx) => (
                        <TableRow
                          key={row.agent_id || idx}
                          className={`transition-colors hover:bg-indigo-50/20 ${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}
                        >
                          <TableCell>
                            <div className="font-semibold text-slate-900">{row.agent_name}</div>
                            <div className="text-xs text-slate-400">{row.agent_email}</div>
                          </TableCell>
                          <TableCell>
                            <span className="font-bold text-slate-900">{formatReportNumber(row.total_calls)}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-slate-700">
                              <span className="text-indigo-600 font-semibold">{row.incoming_calls} in</span> • <span className="text-blue-600 font-semibold">{row.outgoing_calls} out</span>
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="green" size="sm">{row.completed_calls}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs font-semibold text-slate-800">
                              {formatReportDuration(row.total_duration_seconds)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs text-slate-600">
                              {formatReportDuration(row.average_duration_seconds)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-slate-800">{row.outcomes_recorded}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold text-amber-700">{row.follow_ups_assigned}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </>
                )}

                {/* 6. Audit Logs Table */}
                {activeTab === 'audit-logs' && (
                  <>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Audit ID</TableHeaderCell>
                        <TableHeaderCell>User</TableHeaderCell>
                        <TableHeaderCell>Action</TableHeaderCell>
                        <TableHeaderCell>Entity</TableHeaderCell>
                        <TableHeaderCell>Description</TableHeaderCell>
                        <TableHeaderCell className="text-right">Timestamp</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {displayedData.map((row, idx) => (
                        <TableRow
                          key={row.audit_id || idx}
                          className={`transition-colors hover:bg-indigo-50/20 ${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}
                        >
                          <TableCell>
                            <span className="font-mono text-xs font-bold text-slate-500">#{row.audit_id}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-slate-900">{row.user_name || `User #${row.user_id}`}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="purple" size="sm">{row.action}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs text-slate-700 uppercase">
                              {row.entity_type} {row.entity_id ? `#${row.entity_id}` : ''}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-slate-600 line-clamp-1">{row.description}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-xs text-slate-500">{formatReportDate(row.created_at)}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </>
                )}
              </Table>
            </div>

            {/* Pagination Footer */}
            <div className="px-4 sm:px-6 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Page <strong className="text-slate-800 font-semibold">{currentPage + 1}</strong>
                {displayedData.length > 0 && ` (${displayedData.length} records shown)`}
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={!hasNextPage}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
};

export default ReportsPage;
