import { useState, useEffect, useRef } from 'react';
import { customerService } from '../services/customerService';
import { formatDateTime, formatPhoneNumber, formatCustomerName, formatCustomerStatus } from '../utils/formatters';

import PageContainer from '../components/layout/PageContainer';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Toast from '../components/ui/Toast';
import CustomerFormModal from '../components/customers/CustomerFormModal';
import CustomerDetailsModal from '../components/customers/CustomerDetailsModal';
import DeleteCustomerModal from '../components/customers/DeleteCustomerModal';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../components/ui/Table';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import ErrorMessage from '../components/common/ErrorMessage';

const PAGE_SIZE = 10;
const DEBOUNCE_DELAY_MS = 250;

export const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Search & Pagination State
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);

  const searchInputRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const latestRequestIdRef = useRef(0);

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsCustomer, setDetailsCustomer] = useState(null);

  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [deactivatingCustomer, setDeactivatingCustomer] = useState(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Fetch Customers from Backend
  useEffect(() => {
    let isMounted = true;
    const requestId = ++latestRequestIdRef.current;

    const fetchCustomers = async () => {
      try {
        setIsLoading(true);
        setError('');

        const data = await customerService.getCustomers({
          skip: currentPage * PAGE_SIZE,
          limit: PAGE_SIZE + 1,
          search: activeSearch || undefined,
        });

        if (isMounted && requestId === latestRequestIdRef.current) {
          setCustomers(data);
          setIsSearching(false);
        }
      } catch (err) {
        if (isMounted && requestId === latestRequestIdRef.current) {
          setError(err.message || 'Unable to load customer records. Please try again.');
          setIsSearching(false);
        }
      } finally {
        if (isMounted && requestId === latestRequestIdRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchCustomers();

    return () => {
      isMounted = false;
    };
  }, [currentPage, activeSearch, refreshTrigger]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Real-Time / Live Search Handler
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    const trimmed = value.trim();

    if (!trimmed) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      setIsSearching(false);
      setCurrentPage(0);
      setActiveSearch('');
      return;
    }

    setIsSearching(true);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setCurrentPage(0);
      setActiveSearch(trimmed);
    }, DEBOUNCE_DELAY_MS);
  };

  // Clear Search Handler
  const handleClearSearch = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSearchInput('');
    setActiveSearch('');
    setIsSearching(false);
    setCurrentPage(0);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Prevent form submission on Enter
  const handleSearchFormSubmit = (e) => {
    e.preventDefault();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    const trimmed = searchInput.trim();
    setCurrentPage(0);
    setActiveSearch(trimmed);
  };

  // Open Create Customer Modal
  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setSelectedCustomer(null);
    setIsFormModalOpen(true);
  };

  // Open Edit Customer Modal
  const handleOpenEditModal = (customer) => {
    setIsEditing(true);
    setSelectedCustomer(customer);
    setIsFormModalOpen(true);
  };

  // Open Details Modal
  const handleOpenDetailsModal = (customer) => {
    setDetailsCustomer(customer);
    setIsDetailsModalOpen(true);
  };

  // Open Deactivate Modal
  const handleOpenDeactivateModal = (customer) => {
    setDeactivatingCustomer(customer);
    setIsDeactivateModalOpen(true);
  };

  // Handle Create / Update Customer Submit
  const handleFormSubmit = async (payload) => {
    if (isEditing && selectedCustomer) {
      await customerService.updateCustomer(selectedCustomer.id, payload);
      setToast({ message: '✓ Customer updated successfully', type: 'success' });
    } else {
      await customerService.createCustomer(payload);
      setToast({ message: '✓ Customer created successfully', type: 'success' });
    }
    triggerRefresh();
  };

  // Handle Deactivate Confirm
  const handleConfirmDeactivate = async () => {
    if (!deactivatingCustomer) return;
    setIsDeactivating(true);

    try {
      await customerService.deleteCustomer(deactivatingCustomer.id);
      setToast({ message: `✓ Customer ${deactivatingCustomer.name} deactivated`, type: 'success' });
      setIsDeactivateModalOpen(false);
      setDeactivatingCustomer(null);
      triggerRefresh();
    } catch (err) {
      setToast({ message: err.message || 'Failed to deactivate customer.', type: 'error' });
    } finally {
      setIsDeactivating(false);
    }
  };

  const displayedCustomers = customers.slice(0, PAGE_SIZE);
  const hasNextPage = customers.length > PAGE_SIZE;

  return (
    <PageContainer
      title="Customers"
      subtitle="Manage and view customer information"
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
          <span>Add Customer</span>
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

      {/* Real-Time Live Search Bar */}
      <div className="mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearchFormSubmit} className="relative w-full">
          <div className="relative flex items-center">
            {/* Left Search Icon */}
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Live Search Input */}
            <input
              ref={searchInputRef}
              type="text"
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Search by name, phone, email, or company..."
              className="w-full pl-10 pr-24 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />

            {/* Right Status / Clear Action Controls */}
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
              {/* Subtle Searching Spinner */}
              {isSearching && (
                <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium animate-in fade-in">
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline text-[11px]">Searching...</span>
                </div>
              )}

              {/* Clear '×' Button */}
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Active Search Result Tag */}
        {activeSearch && (
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
            <span>
              Live matching results for: <strong className="font-semibold text-slate-800">"{activeSearch}"</strong>
            </span>
            <button
              onClick={handleClearSearch}
              className="text-indigo-600 hover:text-indigo-700 font-medium hover:underline cursor-pointer"
            >
              Reset to all customers
            </button>
          </div>
        )}
      </div>

      {/* Customer Directory Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Customer Directory</h2>
            <p className="text-xs text-slate-500 mt-0.5">All active client and lead contact profiles</p>
          </div>
          <Badge variant={activeSearch ? 'indigo' : 'gray'} size="sm">
            {activeSearch ? `Page ${currentPage + 1} (Filtered)` : `Page ${currentPage + 1}`}
          </Badge>
        </div>

        {isLoading && !isSearching ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" />
            <p className="mt-3 text-xs font-medium text-slate-500">Loading customer profiles...</p>
          </div>
        ) : displayedCustomers.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No customers found"
              description={
                activeSearch
                  ? 'Try searching with a different name, phone number, email, or company.'
                  : 'Start building your customer relationship directory by adding your first customer.'
              }
              action={
                activeSearch ? (
                  <Button variant="outline" size="sm" onClick={handleClearSearch}>
                    Clear Search
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
                    + Add First Customer
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
                    <TableHeaderCell>Customer</TableHeaderCell>
                    <TableHeaderCell>Phone</TableHeaderCell>
                    <TableHeaderCell>Email</TableHeaderCell>
                    <TableHeaderCell>Company</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Created</TableHeaderCell>
                    <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedCustomers.map((c, idx) => {
                    const statusInfo = formatCustomerStatus(c.is_active);
                    return (
                      <TableRow
                        key={c.id}
                        className={`transition-colors hover:bg-indigo-50/20 ${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}
                      >
                        {/* Name & Avatar */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {c.name ? c.name.slice(0, 2).toUpperCase() : 'CU'}
                            </div>
                            <div>
                              <button
                                onClick={() => handleOpenDetailsModal(c)}
                                className="font-semibold text-slate-900 hover:text-indigo-600 text-left hover:underline cursor-pointer transition-colors"
                              >
                                {formatCustomerName(c.name)}
                              </button>
                              {c.notes && (
                                <div className="text-[11px] text-slate-400 line-clamp-1 max-w-[200px]">
                                  {c.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Phone */}
                        <TableCell>
                          <span className="font-mono text-xs font-medium text-slate-800">
                            {formatPhoneNumber(c.phone)}
                          </span>
                        </TableCell>

                        {/* Email */}
                        <TableCell>
                          <span className="text-xs text-slate-600">{c.email || '—'}</span>
                        </TableCell>

                        {/* Company */}
                        <TableCell>
                          <span className="text-xs text-slate-700 font-medium">{c.company || '—'}</span>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge variant={statusInfo.variant} size="sm">
                            {statusInfo.label}
                          </Badge>
                        </TableCell>

                        {/* Created */}
                        <TableCell>
                          <span className="text-xs text-slate-500">{formatDateTime(c.created_at)}</span>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Details */}
                            <button
                              onClick={() => handleOpenDetailsModal(c)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="View customer profile"
                              aria-label="View Details"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => handleOpenEditModal(c)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="Edit customer details"
                              aria-label="Edit Customer"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>

                            {/* Deactivate */}
                            <button
                              onClick={() => handleOpenDeactivateModal(c)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Deactivate customer profile"
                              aria-label="Deactivate Customer"
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
                {displayedCustomers.length > 0 && ` (${displayedCustomers.length} records shown)`}
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

      {/* 1. Redesigned Enterprise CRM CustomerFormModal */}
      <CustomerFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        isEditing={isEditing}
        initialData={selectedCustomer}
      />

      {/* 2. Customer Details Modal */}
      <CustomerDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        customer={detailsCustomer}
        onEdit={handleOpenEditModal}
      />

      {/* 3. Deactivate Confirmation Modal */}
      <DeleteCustomerModal
        isOpen={isDeactivateModalOpen}
        onClose={() => setIsDeactivateModalOpen(false)}
        customer={deactivatingCustomer}
        onConfirmDeactivate={handleConfirmDeactivate}
        isDeactivating={isDeactivating}
      />
    </PageContainer>
  );
};

export default CustomersPage;
