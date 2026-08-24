import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { auditLogService } from '../services/auditLogService';
import { formatDateTime, getStatusVariant } from '../utils/formatters';

import PageContainer from '../components/layout/PageContainer';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import AuditLogDetailsModal from '../components/auditLogs/AuditLogDetailsModal';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../components/ui/Table';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import ErrorMessage from '../components/common/ErrorMessage';

const PAGE_SIZE = 20;

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
  const isAdmin = user?.role === 'admin';

  const [searchParams, setSearchParams] = useSearchParams();

  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filter Form State
  const [actionInput, setActionInput] = useState(searchParams.get('action') || 'all');
  const [entityTypeInput, setEntityTypeInput] = useState(searchParams.get('entity_type') || 'all');
  const [entityIdInput, setEntityIdInput] = useState(searchParams.get('entity_id') || '');
  const [userIdInput, setUserIdInput] = useState(searchParams.get('user_id') || '');
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  const [currentPage, setCurrentPage] = useState(0);

  // Modal State
  const [detailsAuditLog, setDetailsAuditLog] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Fetch Audit Logs from Backend
  useEffect(() => {
    let isMounted = true;

    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        setError('');

        const params = {
          skip: currentPage * PAGE_SIZE,
          limit: PAGE_SIZE + 1,
        };

        const actionParam = searchParams.get('action');
        if (actionParam && actionParam !== 'all') params.action = actionParam;

        const entityTypeParam = searchParams.get('entity_type');
        if (entityTypeParam && entityTypeParam !== 'all') params.entity_type = entityTypeParam;

        const entityIdParam = searchParams.get('entity_id');
        if (entityIdParam) params.entity_id = parseInt(entityIdParam, 10);

        const userIdParam = searchParams.get('user_id');
        if (isAdmin && userIdParam) params.user_id = parseInt(userIdParam, 10);

        const searchParam = searchParams.get('search');
        if (searchParam) params.search = searchParam;

        const data = await auditLogService.getAuditLogs(params);

        if (isMounted) {
          setAuditLogs(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to load audit logs. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchLogs();

    return () => {
      isMounted = false;
    };
  }, [currentPage, searchParams, refreshTrigger, isAdmin]);

  const handleApplyFilters = (e) => {
    e.preventDefault();
    const next = new URLSearchParams();

    if (actionInput && actionInput !== 'all') next.set('action', actionInput);
    if (entityTypeInput && entityTypeInput !== 'all') next.set('entity_type', entityTypeInput);
    if (entityIdInput.trim()) next.set('entity_id', entityIdInput.trim());
    if (isAdmin && userIdInput.trim()) next.set('user_id', userIdInput.trim());
    if (searchInput.trim()) next.set('search', searchInput.trim());

    setCurrentPage(0);
    setSearchParams(next);
  };

  const handleClearFilters = () => {
    setActionInput('all');
    setEntityTypeInput('all');
    setEntityIdInput('');
    setUserIdInput('');
    setSearchInput('');
    setCurrentPage(0);
    setSearchParams({});
  };

  const isFilterActive =
    (searchParams.get('action') && searchParams.get('action') !== 'all') ||
    (searchParams.get('entity_type') && searchParams.get('entity_type') !== 'all') ||
    searchParams.get('entity_id') ||
    searchParams.get('user_id') ||
    searchParams.get('search');

  const displayedLogs = auditLogs.slice(0, PAGE_SIZE);
  const hasNextPage = auditLogs.length > PAGE_SIZE;

  return (
    <PageContainer
      title={isAdmin ? 'Audit Logs' : 'My Activity'}
      subtitle={
        isAdmin
          ? 'Organization-wide activity and system audit history'
          : 'Your account activity and audit history'
      }
      actions={
        <div className="flex items-center gap-2.5">
          <Badge variant={isAdmin ? 'purple' : 'indigo'} size="md">
            {isAdmin ? 'Admin View' : 'Agent Activity'}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshTrigger((p) => p + 1)}
            disabled={isLoading}
            className="shadow-xs"
          >
            <svg className="w-4 h-4 mr-1 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
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

      {/* 1. Filter Controls Bar */}
      <div className="mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <form onSubmit={handleApplyFilters} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Action Select */}
            <div>
              <label htmlFor="audit-action" className="block text-[11px] font-semibold text-slate-500 mb-1">
                Action
              </label>
              <select
                id="audit-action"
                value={actionInput}
                onChange={(e) => setActionInput(e.target.value)}
                className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {ACTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Entity Type Select */}
            <div>
              <label htmlFor="audit-entity-type" className="block text-[11px] font-semibold text-slate-500 mb-1">
                Entity Type
              </label>
              <select
                id="audit-entity-type"
                value={entityTypeInput}
                onChange={(e) => setEntityTypeInput(e.target.value)}
                className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {ENTITY_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Entity ID */}
            <div>
              <label htmlFor="audit-entity-id" className="block text-[11px] font-semibold text-slate-500 mb-1">
                Entity ID
              </label>
              <input
                id="audit-entity-id"
                type="number"
                min="1"
                value={entityIdInput}
                onChange={(e) => setEntityIdInput(e.target.value)}
                placeholder="e.g. 15"
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* User ID (Admin Only) */}
            {isAdmin ? (
              <div>
                <label htmlFor="audit-user-id" className="block text-[11px] font-semibold text-slate-500 mb-1">
                  User ID
                </label>
                <input
                  id="audit-user-id"
                  type="number"
                  min="1"
                  value={userIdInput}
                  onChange={(e) => setUserIdInput(e.target.value)}
                  placeholder="e.g. 2"
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="audit-search" className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Search
                </label>
                <input
                  id="audit-search"
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search description..."
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            )}
          </div>

          {/* Admin Search & Buttons Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
            {isAdmin && (
              <div className="flex-1 max-w-sm">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search description or action..."
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              {isFilterActive && (
                <Button variant="outline" size="sm" onClick={handleClearFilters} className="h-9 text-xs">
                  Clear Filters
                </Button>
              )}

              <Button variant="primary" size="sm" type="submit" className="h-9 text-xs">
                Apply Filters
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* 2. Audit Logs Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Audit Trail</h2>
            <p className="text-xs text-slate-500 mt-0.5">Immutable historical record of events and state changes</p>
          </div>
          <Badge variant={isFilterActive ? 'indigo' : 'gray'} size="sm">
            Page {currentPage + 1} {isFilterActive && '(Filtered)'}
          </Badge>
        </div>

        {isLoading ? (
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
                        <Badge variant={getStatusVariant(log.action)} size="sm">
                          {log.action}
                        </Badge>
                      </TableCell>

                      {/* Entity Type */}
                      <TableCell>
                        <Badge variant="gray" size="sm" className="capitalize">
                          {log.entity_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>

                      {/* Entity ID */}
                      <TableCell>
                        <span className="font-mono text-xs text-slate-700">
                          {log.entity_id !== null && log.entity_id !== undefined ? `#${log.entity_id}` : '—'}
                        </span>
                      </TableCell>

                      {/* Description */}
                      <TableCell>
                        <span className="text-xs text-slate-700 max-w-xs line-clamp-1" title={log.description}>
                          {log.description || '—'}
                        </span>
                      </TableCell>

                      {/* Timestamp */}
                      <TableCell>
                        <span className="text-xs text-slate-500 whitespace-nowrap">
                          {formatDateTime(log.created_at)}
                        </span>
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

      {/* Details Modal */}
      <AuditLogDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        auditLog={detailsAuditLog}
      />
    </PageContainer>
  );
};

export default AuditLogsPage;
