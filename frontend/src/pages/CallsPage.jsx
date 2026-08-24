import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { callService } from '../services/callService';
import { customerService } from '../services/customerService';
import {
  formatDuration,
  formatDateTime,
  formatPhoneNumber,
  getStatusVariant,
} from '../utils/formatters';

import PageContainer from '../components/layout/PageContainer';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Toast from '../components/ui/Toast';
import CreateCallModal from '../components/calls/CreateCallModal';
import CallDetailsModal from '../components/calls/CallDetailsModal';
import ReassignCallModal from '../components/calls/ReassignCallModal';
import CallOutcomeDropdown from '../components/ui/CallOutcomeDropdown';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../components/ui/Table';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import ErrorMessage from '../components/common/ErrorMessage';

const PAGE_SIZE = 10;
const DEBOUNCE_DELAY_MS = 250;

const DIRECTION_OPTIONS = [
  { value: 'all', label: 'All Directions' },
  { value: 'incoming', label: '↙ Incoming' },
  { value: 'outgoing', label: '↗ Outgoing' },
];

const PLATFORM_OPTIONS = [
  { value: 'all', label: 'All Platforms' },
  { value: 'phone', label: 'Phone' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'google_meet', label: 'Google Meet' },
  { value: 'microsoft_teams', label: 'Teams' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'completed', label: 'Completed' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'ringing', label: 'Ringing' },
  { value: 'initiated', label: 'Initiated' },
  { value: 'missed', label: 'Missed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const CallsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [searchParams, setSearchParams] = useSearchParams();

  const [calls, setCalls] = useState([]);
  const [customersMap, setCustomersMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters from URL
  const directionFilter = searchParams.get('direction') || 'all';
  const platformFilter = searchParams.get('platform') || 'all';
  const statusFilter = searchParams.get('status') || 'all';
  const urlSearch = searchParams.get('search') || '';

  const [searchInput, setSearchInput] = useState(urlSearch);
  const [activeSearch, setActiveSearch] = useState(urlSearch);
  const [currentPage, setCurrentPage] = useState(0);

  const searchInputRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const latestRequestIdRef = useRef(0);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [detailsCall, setDetailsCall] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [reassignCall, setReassignCall] = useState(null);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);

  const [initiatingCallId, setInitiatingCallId] = useState(null);

  // Preload customers to enrich customer_id with names & phone numbers
  useEffect(() => {
    let isMounted = true;
    customerService
      .getCustomers({ limit: 200 })
      .then((customerList) => {
        if (isMounted) {
          const map = {};
          customerList.forEach((c) => {
            map[c.id] = c;
          });
          setCustomersMap(map);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Calls from Backend
  useEffect(() => {
    let isMounted = true;
    const requestId = ++latestRequestIdRef.current;

    const fetchCalls = async () => {
      try {
        setIsLoading(true);
        setError('');

        const params = {
          skip: currentPage * PAGE_SIZE,
          limit: PAGE_SIZE + 1,
        };

        if (directionFilter !== 'all') params.direction = directionFilter;
        if (platformFilter !== 'all') params.platform = platformFilter;
        if (statusFilter !== 'all') params.status = statusFilter;
        if (activeSearch) params.search = activeSearch;

        const data = await callService.getCalls(params);

        if (isMounted && requestId === latestRequestIdRef.current) {
          setCalls(data);
          setIsSearching(false);
        }
      } catch (err) {
        if (isMounted && requestId === latestRequestIdRef.current) {
          setError(err.message || 'Failed to load call logs. Please try again.');
          setIsSearching(false);
        }
      } finally {
        if (isMounted && requestId === latestRequestIdRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchCalls();

    return () => {
      isMounted = false;
    };
  }, [currentPage, directionFilter, platformFilter, statusFilter, activeSearch, refreshTrigger]);

  // Clean up debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Filter Handlers
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
  const handleCreateCall = async (payload) => {
    const { outcome, ...callData } = payload;
    const newCall = await callService.createCall(callData);
    if (outcome) {
      try {
        await callService.recordCallOutcome(newCall.id, outcome, 'Recorded on call creation');
      } catch (outcomeErr) {
        console.warn('Outcome recording error:', outcomeErr);
      }
    }
    setToast({ message: '✓ Call created successfully', type: 'success' });
    triggerRefresh();
  };

  const handleInitiateCall = async (callId) => {
    setInitiatingCallId(callId);
    try {
      const updated = await callService.initiateCall(callId);
      setToast({
        message: `✓ Outgoing call initiated (External SID: ${updated.external_call_id || 'Triggered'})`,
        type: 'success',
      });
      triggerRefresh();
      if (detailsCall && detailsCall.id === callId) {
        setDetailsCall(updated);
      }
    } catch (err) {
      setToast({
        message: err.message || 'Failed to initiate telephony call.',
        type: 'error',
      });
    } finally {
      setInitiatingCallId(null);
    }
  };

  const handleReassignCall = async (callId, targetAgentId) => {
    await callService.assignCall(callId, targetAgentId);
    setToast({ message: '✓ Call reassigned to agent successfully', type: 'success' });
    triggerRefresh();
  };

  const handleOutcomeChange = async (callId, outcome) => {
    try {
      await callService.recordCallOutcome(callId, outcome);
      setToast({ message: '✓ Call outcome recorded successfully', type: 'success' });
      triggerRefresh();
    } catch (err) {
      setToast({ message: err.message || 'Unable to update outcome.', type: 'error' });
      throw err;
    }
  };

  const isAnyFilterActive =
    directionFilter !== 'all' ||
    platformFilter !== 'all' ||
    statusFilter !== 'all' ||
    activeSearch !== '';

  const displayedCalls = calls.slice(0, PAGE_SIZE);
  const hasNextPage = calls.length > PAGE_SIZE;

  return (
    <PageContainer
      title="Calls"
      subtitle="Manage, track, and monitor call activity"
      actions={
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          className="shadow-xs"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Call</span>
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
            placeholder="Search calls by subject, notes, or external call ID..."
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
                title="Clear search input"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {/* Direction Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-700">
            <span className="text-slate-400 font-medium">Direction:</span>
            <select
              value={directionFilter}
              onChange={(e) => handleFilterChange('direction', e.target.value)}
              className="h-8 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {DIRECTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Platform Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-700">
            <span className="text-slate-400 font-medium">Platform:</span>
            <select
              value={platformFilter}
              onChange={(e) => handleFilterChange('platform', e.target.value)}
              className="h-8 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {PLATFORM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

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

      {/* Calls Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Call Records</h2>
            <p className="text-xs text-slate-500 mt-0.5">Telephony communications and voice sessions</p>
          </div>
          <Badge variant={isAnyFilterActive ? 'indigo' : 'gray'} size="sm">
            Page {currentPage + 1} {isAnyFilterActive && '(Filtered)'}
          </Badge>
        </div>

        {isLoading && !isSearching ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" />
            <p className="mt-3 text-xs font-medium text-slate-500">Loading call activity...</p>
          </div>
        ) : displayedCalls.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={isAnyFilterActive ? 'No calls match your current filters' : 'No calls logged yet'}
              description={
                isAnyFilterActive
                  ? 'Try adjusting your direction, platform, status, or search query.'
                  : 'Start communicating by initiating your first call record.'
              }
              action={
                isAnyFilterActive ? (
                  <Button variant="outline" size="sm" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
                    + Log New Call
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
                    <TableHeaderCell>Direction</TableHeaderCell>
                    <TableHeaderCell>Platform</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Duration</TableHeaderCell>
                    <TableHeaderCell>Outcome</TableHeaderCell>
                    <TableHeaderCell>Time</TableHeaderCell>
                    <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedCalls.map((call, idx) => {
                    const customer = customersMap[call.customer_id];
                    const isOngoingOrInitiated =
                      call.direction === 'outgoing' &&
                      call.status !== 'completed' &&
                      call.status !== 'failed' &&
                      call.status !== 'cancelled' &&
                      !call.external_call_id;

                    return (
                      <TableRow
                        key={call.id}
                        className={`transition-colors hover:bg-indigo-50/20 ${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}
                      >
                        {/* Call ID */}
                        <TableCell>
                          <span className="font-mono text-xs font-bold text-slate-500">#{call.id}</span>
                        </TableCell>

                        {/* Customer */}
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => {
                              setDetailsCall(call);
                              setIsDetailsModalOpen(true);
                            }}
                            className="font-semibold text-slate-900 hover:text-indigo-600 text-left hover:underline cursor-pointer transition-colors"
                          >
                            {customer?.name || call.customer_name || `Customer #${call.customer_id}`}
                          </button>
                          <div className="text-xs text-slate-500 font-mono">
                            {formatPhoneNumber(customer?.phone || call.customer_phone || '')}
                          </div>
                        </TableCell>

                        {/* Direction */}
                        <TableCell>
                          <Badge variant={call.direction === 'outgoing' ? 'blue' : 'indigo'} size="sm">
                            {call.direction?.toUpperCase()}
                          </Badge>
                        </TableCell>

                        {/* Platform */}
                        <TableCell>
                          <span className="text-xs capitalize font-medium text-slate-700">
                            {call.call_type || 'Phone'}
                          </span>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge variant={getStatusVariant(call.status)} size="sm">
                            {call.status}
                          </Badge>
                        </TableCell>

                        {/* Duration */}
                        <TableCell>
                          <span className="font-mono text-xs text-slate-700">
                            {formatDuration(call.duration_seconds)}
                          </span>
                        </TableCell>

                        {/* Outcome */}
                        <TableCell>
                          <CallOutcomeDropdown
                            callId={call.id}
                            currentOutcome={call.outcome}
                            onOutcomeChange={handleOutcomeChange}
                          />
                        </TableCell>

                        {/* Started At */}
                        <TableCell>
                          <span className="text-xs text-slate-500 whitespace-nowrap">
                            {formatDateTime(call.start_time || call.created_at)}
                          </span>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Initiate Provider Call Button */}
                            {isOngoingOrInitiated && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleInitiateCall(call.id)}
                                isLoading={initiatingCallId === call.id}
                                disabled={initiatingCallId === call.id}
                                title="Initiate Call via Telephony Provider"
                                className="!py-1 !px-2 text-xs"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span>Dial</span>
                              </Button>
                            )}

                            {/* View Details */}
                            <button
                              onClick={() => {
                                setDetailsCall(call);
                                setIsDetailsModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="View Call Details"
                              aria-label="View Details"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>

                            {/* Admin Reassign Button */}
                            {isAdmin && (
                              <button
                                onClick={() => {
                                  setReassignCall(call);
                                  setIsReassignModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                                title="Admin: Reassign Call"
                                aria-label="Reassign Agent"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                              </button>
                            )}
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
                {displayedCalls.length > 0 && ` (${displayedCalls.length} records shown)`}
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

      {/* 1. Create Call Modal */}
      <CreateCallModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateCall}
      />

      {/* 2. Call Details Modal */}
      <CallDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        call={detailsCall}
        onInitiateCall={handleInitiateCall}
        isInitiating={initiatingCallId === detailsCall?.id}
      />

      {/* 3. Admin Reassign Call Modal */}
      <ReassignCallModal
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        call={reassignCall}
        onReassign={handleReassignCall}
      />
    </PageContainer>
  );
};

export default CallsPage;
