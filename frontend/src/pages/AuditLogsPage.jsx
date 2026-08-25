import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { auditLogService } from '../services/auditLogService';
import { userService } from '../services/userService';
import {
  formatAuditAction,
  getAuditActionVariant,
  formatAuditEntityType,
  getAuditEntityVariant,
  formatAuditDate,
  formatAuditRelativeTime,
} from '../utils/auditLogUtils';
import { getRoleBadgeVariant, isAdmin, isManager, isAdminOrManager } from '../utils/permissions';

import PageContainer from '../components/layout/PageContainer';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import AuditLogDetailsModal from '../components/auditLogs/AuditLogDetailsModal';
import CallAuditTrailModal from '../components/auditLogs/CallAuditTrailModal';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../components/ui/Table';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import ErrorMessage from '../components/common/ErrorMessage';

const PAGE_SIZE = 20;
const DEBOUNCE_DELAY_MS = 250;

const ACTION_OPTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'deactivate', label: 'Deactivate' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'assign', label: 'Assign' },
  { value: 'status_change', label: 'Status Change' },
  { value: 'complete', label: 'Complete' },
  { value: 'mark_read', label: 'Mark Read' },
  { value: 'other', label: 'Other' },
];

const ENTITY_TYPE_OPTIONS = [
  { value: 'all', label: 'All Entities' },
  { value: 'user', label: 'User' },
  { value: 'customer', label: 'Customer' },
  { value: 'call', label: 'Call' },
  { value: 'call_outcome', label: 'Call Outcome' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'notification', label: 'Notification' },
  { value: 'system', label: 'System' },
  { value: 'other', label: 'Other' },
];

export const AuditLogsPage = () => {
  const { user } = useAuth();
  const canViewMultipleUsers = isAdminOrManager(user);

  const [searchParams, setSearchParams] = useSearchParams();

  const [auditLogs, setAuditLogs] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);

  // Modals
  const [detailsAuditLog, setDetailsAuditLog] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCallTrailOpen, setIsCallTrailOpen] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filter params from URL
  const actionParam = searchParams.get('action') || 'all';
  const entityTypeParam = searchParams.get('entity_type') || 'all';
  const entityIdParam = searchParams.get('entity_id') || '';
  const userIdParam = searchParams.get('user_id') || 'all';
  const urlSearch = searchParams.get('search') || '';

  const [searchInput, setSearchInput] = useState(urlSearch);
  const [activeSearch, setActiveSearch] = useState(urlSearch);

  const debounceTimerRef = useRef(null);
  const latestRequestIdRef = useRef(0);

  // Preload Users for Admin & Manager
  useEffect(() => {
    if (canViewMultipleUsers) {
      userService.getUsers({ limit: 100 }).then(setUsersList).catch(() => {});
    }
  }, [canViewMultipleUsers]);

  // Fetch Audit Logs
  useEffect(() => {
    let isMounted = true;
    const requestId = ++latestRequestIdRef.current;

    const fetchLogs = async () => {
      try {
        if (refreshTrigger === 0) setIsLoading(true);
        else setIsRefreshing(true);
        setError('');

        const params = {
          skip: currentPage * PAGE_SIZE,
          limit: PAGE_SIZE + 1,
        };

        if (actionParam !== 'all') params.action = actionParam;
        if (entityTypeParam !== 'all') params.entity_type = entityTypeParam;
        if (entityIdParam) params.entity_id = parseInt(entityIdParam, 10);
        if (canViewMultipleUsers && userIdParam !== 'all') {
          params.user_id = parseInt(userIdParam, 10);
        }
        if (activeSearch) params.search = activeSearch;

        const data = await auditLogService.getAuditLogs(params);

        if (isMounted && requestId === latestRequestIdRef.current) {
          setAuditLogs(data);
          setIsSearching(false);
        }
      } catch (err) {
        if (isMounted && requestId === latestRequestIdRef.current) {
          setError(err.message || 'Unable to load audit logs. Please try again.');
          setIsSearching(false);
        }
      } finally {
        if (isMounted && requestId === latestRequestIdRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    fetchLogs();

    return () => {
      isMounted = false;
    };
  }, [currentPage, actionParam, entityTypeParam, entityIdParam, userIdParam, activeSearch, refreshTrigger, canViewMultipleUsers]);

  // Search input debouncing
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    const trimmed = val.trim();

    if (!trimmed) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      setIsSearching(false);
      setActiveSearch('');
      setCurrentPage(0);
      const next = new URLSearchParams(searchParams);
      next.delete('search');
      setSearchParams(next);
      return;
    }

    setIsSearching(true);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      setActiveSearch(trimmed);
      setCurrentPage(0);
      const next = new URLSearchParams(searchParams);
      next.set('search', trimmed);
      setSearchParams(next);
    }, DEBOUNCE_DELAY_MS);
  };

  const handleFilterChange = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setCurrentPage(0);
    setSearchParams(next);
  };

  const handleClearFilters = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setSearchInput('');
    setActiveSearch('');
    setIsSearching(false);
    setCurrentPage(0);
    setSearchParams({});
  };

  const isFilterActive =
    actionParam !== 'all' ||
    entityTypeParam !== 'all' ||
    entityIdParam !== '' ||
    userIdParam !== 'all' ||
    activeSearch !== '';

  const displayedLogs = auditLogs.slice(0, PAGE_SIZE);
  const hasNextPage = auditLogs.length > PAGE_SIZE;

  // Role subtitle determination
  const pageSubtitle = isAdmin(user)
    ? 'Organization Activity Logs'
    : isManager(user)
    ? 'Team Activity Logs'
    : 'My Activity Logs';

  return (
    <PageContainer
      title="Audit Logs"
      subtitle={pageSubtitle}
      actions={
        <div className="flex items-center gap-2.5">
          <Badge variant={getRoleBadgeVariant(user?.role)} size="md">
            {isAdmin(user) ? 'ORGANIZATION VIEW' : isManager(user) ? 'TEAM VIEW' : 'AGENT ACTIVITY'}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedCallId(null);
              setIsCallTrailOpen(true);
            }}
            title="Inspect chronological lifecycle for a specific call"
            className="shadow-xs"
          >
            <svg className="w-4 h-4 mr-1 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Call Audit Trail</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshTrigger((p) => p + 1)}
            disabled={isLoading || isRefreshing}
            isLoading={isRefreshing}
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
      {/* Error Alert */}
      {error && (
        <ErrorMessage
          message={error}
          onRetry={() => setRefreshTrigger((p) => p + 1)}
          onDismiss={() => setError('')}
          className="mb-6"
        />
      )}

      {/* 1. Search & Filter Controls Bar */}
      <div className="mb-6 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        {/* Top Search Bar */}
        <div className="relative flex items-center">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <input
            type="text"
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Search audit descriptions, action types, or values..."
            className="w-full pl-10 pr-24 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />

          <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
            {isSearching && (
              <div className="flex items-center gap-1 text-xs text-indigo-600 font-medium">
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline text-[11px]">Searching...</span>
              </div>
            )}

            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setActiveSearch('');
                  const next = new URLSearchParams(searchParams);
                  next.delete('search');
                  setSearchParams(next);
                }}
                className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center cursor-pointer transition-colors"
                title="Clear search"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Dropdown Filters Grid */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-3">
            {/* Action Select */}
            <div className="flex items-center gap-1.5 text-xs text-slate-700">
              <span className="text-slate-400 font-medium">Action:</span>
              <select
                value={actionParam}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="h-8 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                {ACTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Entity Type Select */}
            <div className="flex items-center gap-1.5 text-xs text-slate-700">
              <span className="text-slate-400 font-medium">Entity:</span>
              <select
                value={entityTypeParam}
                onChange={(e) => handleFilterChange('entity_type', e.target.value)}
                className="h-8 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                {ENTITY_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* User Select (Admin & Manager Only) */}
            {canViewMultipleUsers && (
              <div className="flex items-center gap-1.5 text-xs text-slate-700">
                <span className="text-slate-400 font-medium">User:</span>
                <select
                  value={userIdParam}
                  onChange={(e) => handleFilterChange('user_id', e.target.value)}
                  className="h-8 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                >
                  <option value="all">All Users</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Clear Filters */}
          {isFilterActive && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer ml-auto"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Audit Logs Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Audit Trail</h2>
            <p className="text-xs text-slate-500 mt-0.5">Immutable historical record of security and operational events</p>
          </div>
          <Badge variant={isFilterActive ? 'indigo' : 'gray'} size="sm">
            Page {currentPage + 1} {isFilterActive && '(Filtered)'}
          </Badge>
        </div>

        {isLoading && !isSearching ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" />
            <p className="mt-3 text-xs font-medium text-slate-500">Loading audit history...</p>
          </div>
        ) : displayedLogs.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={isFilterActive ? 'No audit activity matches the selected filters.' : 'No audit activity found.'}
              description={
                isFilterActive
                  ? 'Try clearing or widening your action, entity, or search filter parameters.'
                  : 'System and user activities will automatically appear in this immutable trail.'
              }
              action={
                isFilterActive ? (
                  <Button variant="outline" size="sm" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                ) : null
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table className="border-0 rounded-none shadow-none">
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>ID</TableHeaderCell>
                    <TableHeaderCell>User / Actor</TableHeaderCell>
                    <TableHeaderCell>Action</TableHeaderCell>
                    <TableHeaderCell>Entity Type</TableHeaderCell>
                    <TableHeaderCell>Entity ID</TableHeaderCell>
                    <TableHeaderCell>Description</TableHeaderCell>
                    <TableHeaderCell>Logged At</TableHeaderCell>
                    <TableHeaderCell className="text-right">Details</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-slate-50 transition-colors">
                      {/* ID */}
                      <TableCell>
                        <span className="font-mono font-bold text-xs text-slate-500">#{log.id}</span>
                      </TableCell>

                      {/* User */}
                      <TableCell>
                        <div className="font-semibold text-slate-900">
                          {log.user_name || (log.user_id ? `User #${log.user_id}` : 'System')}
                        </div>
                        {log.user_email && (
                          <div className="text-[11px] text-slate-400">{log.user_email}</div>
                        )}
                      </TableCell>

                      {/* Action */}
                      <TableCell>
                        <Badge variant={getAuditActionVariant(log.action)} size="sm">
                          {formatAuditAction(log.action)}
                        </Badge>
                      </TableCell>

                      {/* Entity Type */}
                      <TableCell>
                        <Badge variant={getAuditEntityVariant(log.entity_type)} size="sm" className="capitalize">
                          {formatAuditEntityType(log.entity_type)}
                        </Badge>
                      </TableCell>

                      {/* Entity ID */}
                      <TableCell>
                        {log.entity_id !== null && log.entity_id !== undefined ? (
                          log.entity_type === 'call' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCallId(log.entity_id);
                                setIsCallTrailOpen(true);
                              }}
                              className="font-mono text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                              title="View Call Trail"
                            >
                              Call #{log.entity_id}
                            </button>
                          ) : (
                            <span className="font-mono text-xs text-slate-700">
                              #{log.entity_id}
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>

                      {/* Description */}
                      <TableCell>
                        <span className="text-xs text-slate-700 max-w-xs line-clamp-1" title={log.description}>
                          {log.description || '—'}
                        </span>
                      </TableCell>

                      {/* Timestamp */}
                      <TableCell>
                        <div>
                          <span className="text-xs font-semibold text-slate-800 block">
                            {formatAuditRelativeTime(log.created_at)}
                          </span>
                          <span className="text-[11px] text-slate-400 whitespace-nowrap block">
                            {formatAuditDate(log.created_at)}
                          </span>
                        </div>
                      </TableCell>

                      {/* View Details Action */}
                      <TableCell className="text-right">
                        <button
                          onClick={() => {
                            setDetailsAuditLog(log);
                            setIsDetailsModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="View Audit Details"
                          aria-label="View Details"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Footer */}
            <div className="px-4 sm:px-6 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Page <strong className="text-slate-800 font-semibold">{currentPage + 1}</strong>
                {displayedLogs.length > 0 && ` (${displayedLogs.length} entries shown)`}
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

      {/* 1. Details Modal */}
      <AuditLogDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        auditLog={detailsAuditLog}
      />

      {/* 2. Call Audit Trail Timeline Modal */}
      <CallAuditTrailModal
        isOpen={isCallTrailOpen}
        onClose={() => {
          setIsCallTrailOpen(false);
          setSelectedCallId(null);
        }}
        initialCallId={selectedCallId}
      />
    </PageContainer>
  );
};

export default AuditLogsPage;
