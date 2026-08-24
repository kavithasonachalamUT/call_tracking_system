import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { followUpService } from '../services/followUpService';
import { customerService } from '../services/customerService';
import { userService } from '../services/userService';
import {
  formatDateTime,
  formatPhoneNumber,
  getStatusVariant,
} from '../utils/formatters';

import PageContainer from '../components/layout/PageContainer';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Toast from '../components/ui/Toast';
import FollowUpFormModal from '../components/followUps/FollowUpFormModal';
import FollowUpDetailsModal from '../components/followUps/FollowUpDetailsModal';
import Modal from '../components/ui/Modal';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../components/ui/Table';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import ErrorMessage from '../components/common/ErrorMessage';

const PAGE_SIZE = 10;
const DEBOUNCE_DELAY_MS = 250;

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: '◷ Pending' },
  { value: 'in_progress', label: '↻ In Progress' },
  { value: 'completed', label: '✓ Completed' },
  { value: 'overdue', label: '⚠ Overdue' },
  { value: 'cancelled', label: '− Cancelled' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'callback', label: '☎ Callback' },
  { value: 'email', label: '✉ Email' },
  { value: 'demo', label: '💻 Demo' },
  { value: 'meeting', label: '📅 Meeting' },
  { value: 'whatsapp', label: '💬 WhatsApp' },
  { value: 'other', label: '📝 Other' },
];

const TYPE_ICONS = {
  callback: '☎',
  email: '✉',
  demo: '💻',
  meeting: '📅',
  whatsapp: '💬',
  other: '📝',
};

export const FollowUpsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [followUps, setFollowUps] = useState([]);
  const [customersMap, setCustomersMap] = useState({});
  const [agentsMap, setAgentsMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters from URL
  const statusFilter = searchParams.get('status') || 'all';
  const typeFilter = searchParams.get('type') || 'all';
  const urlSearch = searchParams.get('search') || '';

  const [searchInput, setSearchInput] = useState(urlSearch);
  const [activeSearch, setActiveSearch] = useState(urlSearch);
  const [currentPage, setCurrentPage] = useState(0);

  const searchInputRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const latestRequestIdRef = useRef(0);

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsFollowUp, setDetailsFollowUp] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingFollowUp, setDeletingFollowUp] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [completingId, setCompletingId] = useState(null);

  // Preload customers & users for reference
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      customerService.getCustomers({ limit: 200 }).catch(() => []),
      userService.getUsers({ limit: 100 }).catch(() => []),
    ]).then(([custList, userList]) => {
      if (isMounted) {
        const cMap = {};
        custList.forEach((c) => { cMap[c.id] = c; });
        setCustomersMap(cMap);

        const aMap = {};
        userList.forEach((u) => { aMap[u.id] = u; });
        setAgentsMap(aMap);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Follow-ups from Backend
  useEffect(() => {
    let isMounted = true;
    const requestId = ++latestRequestIdRef.current;

    const fetchFollowUps = async () => {
      try {
        setIsLoading(true);
        setError('');

        const params = {
          skip: currentPage * PAGE_SIZE,
          limit: PAGE_SIZE + 1,
        };

        if (statusFilter !== 'all') params.status = statusFilter;
        if (typeFilter !== 'all') params.follow_up_type = typeFilter;
        if (activeSearch) params.search = activeSearch;

        const data = await followUpService.getFollowUps(params);

        if (isMounted && requestId === latestRequestIdRef.current) {
          setFollowUps(data);
          setIsSearching(false);
        }
      } catch (err) {
        if (isMounted && requestId === latestRequestIdRef.current) {
          setError(err.message || 'Failed to load follow-up tasks. Please try again.');
          setIsSearching(false);
        }
      } finally {
        if (isMounted && requestId === latestRequestIdRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchFollowUps();

    return () => {
      isMounted = false;
    };
  }, [currentPage, statusFilter, typeFilter, activeSearch, refreshTrigger]);

  // Clean up debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Filter & Search Handlers
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

  const handleClearFilters = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setSearchInput('');
    setActiveSearch('');
    setIsSearching(false);
    setCurrentPage(0);
    setSearchParams({});
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  // Actions
  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setSelectedFollowUp(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (followUp) => {
    setIsEditing(true);
    setSelectedFollowUp(followUp);
    setIsFormModalOpen(true);
  };

  const handleOpenDetailsModal = (followUp) => {
    setDetailsFollowUp(followUp);
    setIsDetailsModalOpen(true);
  };

  const handleOpenDeleteModal = (followUp) => {
    setDeletingFollowUp(followUp);
    setIsDeleteModalOpen(true);
  };

  const handleFormSubmit = async (payload) => {
    if (isEditing && selectedFollowUp) {
      await followUpService.updateFollowUp(selectedFollowUp.id, payload);
      setToast({ message: '✓ Follow-up updated successfully', type: 'success' });
    } else {
      await followUpService.createFollowUp(payload);
      setToast({ message: '✓ Follow-up scheduled successfully', type: 'success' });
    }
    triggerRefresh();
  };

  const handleCompleteFollowUp = async (followUpId) => {
    setCompletingId(followUpId);
    try {
      await followUpService.completeFollowUp(followUpId);
      setToast({ message: '✓ Follow-up marked as completed', type: 'success' });
      triggerRefresh();
      if (detailsFollowUp && detailsFollowUp.id === followUpId) {
        setIsDetailsModalOpen(false);
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to complete follow-up.', type: 'error' });
    } finally {
      setCompletingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingFollowUp) return;
    setIsDeleting(true);

    try {
      await followUpService.deleteFollowUp(deletingFollowUp.id);
      setToast({ message: `✓ Follow-up #${deletingFollowUp.id} removed`, type: 'success' });
      setIsDeleteModalOpen(false);
      setDeletingFollowUp(null);
      triggerRefresh();
    } catch (err) {
      setToast({ message: err.message || 'Failed to delete follow-up.', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const isAnyFilterActive =
    statusFilter !== 'all' ||
    typeFilter !== 'all' ||
    activeSearch !== '';

  const displayedFollowUps = followUps.slice(0, PAGE_SIZE);
  const hasNextPage = followUps.length > PAGE_SIZE;

  return (
    <PageContainer
      title="Follow-ups"
      subtitle="Manage scheduled callbacks and follow-up activities"
      actions={
        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenCreateModal}
          className="shadow-xs"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Follow-up</span>
        </Button>
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
          onRetry={triggerRefresh}
          onDismiss={() => setError('')}
          className="mb-5"
        />
      )}

      {/* Search & Filter Controls Bar */}
      <div className="mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        {/* Top Search Bar */}
        <div className="relative flex items-center">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <input
            ref={searchInputRef}
            type="text"
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Search follow-up notes and agenda..."
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

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-700">
            <span className="text-slate-400 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="h-8 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-700">
            <span className="text-slate-400 font-medium">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="h-8 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {isAnyFilterActive && (
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

      {/* Follow-ups Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Scheduled Follow-ups</h2>
            <p className="text-xs text-slate-500 mt-0.5">Tasks, callback reminders, and upcoming client engagements</p>
          </div>
          <Badge variant={isAnyFilterActive ? 'indigo' : 'gray'} size="sm">
            Page {currentPage + 1} {isAnyFilterActive && '(Filtered)'}
          </Badge>
        </div>

        {isLoading && !isSearching ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" />
            <p className="mt-3 text-xs font-medium text-slate-500">Loading follow-up tasks...</p>
          </div>
        ) : displayedFollowUps.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={isAnyFilterActive ? 'No follow-ups match your current filters' : 'No follow-ups scheduled yet'}
              description={
                isAnyFilterActive
                  ? 'Try adjusting your status, type, or search term.'
                  : 'Stay organized with scheduled callbacks, demos, and follow-ups.'
              }
              action={
                isAnyFilterActive ? (
                  <Button variant="outline" size="sm" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
                    + Schedule First Follow-up
                  </Button>
                )
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
                    <TableHeaderCell>Customer</TableHeaderCell>
                    <TableHeaderCell>Type</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Scheduled Time</TableHeaderCell>
                    <TableHeaderCell>Assigned Agent</TableHeaderCell>
                    <TableHeaderCell>Call Ref</TableHeaderCell>
                    <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedFollowUps.map((fu, idx) => {
                    const customer = customersMap[fu.customer_id];
                    const agent = agentsMap[fu.assigned_to];
                    const isPending = fu.status !== 'completed' && fu.status !== 'cancelled';

                    return (
                      <TableRow
                        key={fu.id}
                        className={`transition-colors hover:bg-indigo-50/20 ${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}
                      >
                        {/* ID */}
                        <TableCell>
                          <span className="font-mono text-xs font-bold text-slate-500">#{fu.id}</span>
                        </TableCell>

                        {/* Customer */}
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => handleOpenDetailsModal(fu)}
                            className="font-semibold text-slate-900 hover:text-indigo-600 text-left hover:underline cursor-pointer transition-colors"
                          >
                            {customer?.name || `Customer #${fu.customer_id}`}
                          </button>
                          <div className="text-xs text-slate-500 font-mono">
                            {formatPhoneNumber(customer?.phone || '')}
                          </div>
                        </TableCell>

                        {/* Type */}
                        <TableCell>
                          <span className="text-xs font-medium text-slate-800 inline-flex items-center gap-1.5">
                            <span>{TYPE_ICONS[fu.follow_up_type] || '📝'}</span>
                            <span className="capitalize">{fu.follow_up_type}</span>
                          </span>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge variant={getStatusVariant(fu.status)} size="sm">
                            {fu.status}
                          </Badge>
                        </TableCell>

                        {/* Scheduled Time */}
                        <TableCell>
                          <span className="text-xs font-medium text-slate-800 whitespace-nowrap">
                            {formatDateTime(fu.scheduled_at)}
                          </span>
                          {fu.completed_at && (
                            <div className="text-[10px] text-emerald-600">
                              Completed: {formatDateTime(fu.completed_at)}
                            </div>
                          )}
                        </TableCell>

                        {/* Agent */}
                        <TableCell>
                          <span className="text-xs text-slate-700 font-medium">
                            {agent?.name || `User #${fu.assigned_to}`}
                          </span>
                        </TableCell>

                        {/* Call Ref */}
                        <TableCell>
                          <span className="font-mono text-xs text-indigo-600 font-semibold">
                            Call #{fu.call_id}
                          </span>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Complete Action */}
                            {isPending && (
                              <button
                                onClick={() => handleCompleteFollowUp(fu.id)}
                                disabled={completingId === fu.id}
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                                title="Mark as Completed"
                                aria-label="Complete Follow-up"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                            )}

                            {/* View Details */}
                            <button
                              onClick={() => handleOpenDetailsModal(fu)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="View Follow-up Details"
                              aria-label="View Details"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => handleOpenEditModal(fu)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="Edit Follow-up"
                              aria-label="Edit Follow-up"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleOpenDeleteModal(fu)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete / Cancel Follow-up"
                              aria-label="Delete Follow-up"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Footer */}
            <div className="px-4 sm:px-6 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Page <strong className="text-slate-800 font-semibold">{currentPage + 1}</strong>
                {displayedFollowUps.length > 0 && ` (${displayedFollowUps.length} records shown)`}
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

      {/* 1. Create / Edit Follow-up Modal */}
      <FollowUpFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        isEditing={isEditing}
        initialData={selectedFollowUp}
      />

      {/* 2. Details Modal */}
      <FollowUpDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        followUp={detailsFollowUp}
        customer={customersMap[detailsFollowUp?.customer_id]}
        agent={agentsMap[detailsFollowUp?.assigned_to]}
        onComplete={handleCompleteFollowUp}
        onEdit={handleOpenEditModal}
        isCompleting={completingId === detailsFollowUp?.id}
      />

      {/* 3. Delete Confirmation Modal */}
      {deletingFollowUp && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
          title="Cancel Follow-up Task"
          maxWidth="max-w-md"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                isLoading={isDeleting}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Task'}
              </Button>
            </>
          }
        >
          <div className="text-left text-sm text-slate-600 space-y-2">
            <p>
              Are you sure you want to cancel Follow-up task <strong className="font-semibold text-slate-900">#{deletingFollowUp.id}</strong>?
            </p>
            <p className="text-xs text-slate-500">
              This will remove the scheduled callback from active queues and calendar reminders.
            </p>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
};

export default FollowUpsPage;
