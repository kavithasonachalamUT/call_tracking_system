import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { notificationService } from '../services/notificationService';
import {
  formatNotificationType,
  getNotificationTypeVariant,
  getNotificationIcon,
  formatRelativeTime,
  formatReferenceLabel,
  getReferencePath,
} from '../utils/notificationUtils';
import { formatDateTime } from '../utils/formatters';
import { isAdmin, isManager } from '../utils/permissions';

import PageContainer from '../components/layout/PageContainer';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Toast from '../components/ui/Toast';
import Modal from '../components/ui/Modal';
import CreateNotificationModal from '../components/notifications/CreateNotificationModal';
import NotificationDetailsModal from '../components/notifications/NotificationDetailsModal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import ErrorMessage from '../components/common/ErrorMessage';

const PAGE_SIZE = 10;
const AUTO_REFRESH_INTERVAL_MS = 30000; // 30s lightweight refresh

const READ_STATUS_OPTIONS = [
  { value: 'all', label: 'All Notifications' },
  { value: 'unread', label: 'Unread Only' },
  { value: 'read', label: 'Read Only' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'call_assigned', label: '☎ Call Assigned' },
  { value: 'follow_up_reminder', label: '⏰ Follow-up Due' },
  { value: 'call_outcome_recorded', label: '✓ Outcome Recorded' },
  { value: 'system_alert', label: '🔔 System Alert' },
  { value: 'other', label: '📝 Other' },
];

export const NotificationsPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [notifications, setNotifications] = useState([]);
  const [summary, setSummary] = useState({ unread_count: 0, total_count: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters from URL
  const readFilter = searchParams.get('is_read') || 'all';
  const typeFilter = searchParams.get('type') || 'all';
  const [currentPage, setCurrentPage] = useState(0);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [detailsNotification, setDetailsNotification] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [deleteNotificationObj, setDeleteNotificationObj] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Notifications & Summary from Backend
  useEffect(() => {
    let isMounted = true;

    const fetchNotifications = async () => {
      try {
        if (refreshTrigger === 0) setIsLoading(true);
        else setIsRefreshing(true);
        setError('');

        const params = {
          skip: currentPage * PAGE_SIZE,
          limit: PAGE_SIZE + 1,
        };

        if (readFilter === 'unread') params.is_read = false;
        if (readFilter === 'read') params.is_read = true;
        if (typeFilter !== 'all') params.notification_type = typeFilter;

        const [notifsData, summaryData] = await Promise.all([
          notificationService.getNotifications(params),
          notificationService.getNotificationSummary().catch(() => ({ unread_count: 0, total_count: 0 })),
        ]);

        if (isMounted) {
          setNotifications(notifsData);
          setSummary(summaryData);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load notifications. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    fetchNotifications();

    return () => {
      isMounted = false;
    };
  }, [currentPage, readFilter, typeFilter, refreshTrigger]);

  // Periodic Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTrigger((prev) => prev + 1);
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
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

  const handleClearFilters = () => {
    setCurrentPage(0);
    setSearchParams({});
  };

  // Actions
  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markNotificationAsRead(notificationId);
      setToast({ message: 'Notification marked as read', type: 'success' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
      setSummary((prev) => ({ ...prev, unread_count: Math.max(0, prev.unread_count - 1) }));

      if (detailsNotification && detailsNotification.id === notificationId) {
        setDetailsNotification((prev) => ({ ...prev, is_read: true, read_at: new Date().toISOString() }));
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to mark as read.', type: 'error' });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (summary.unread_count === 0) return;
    setIsMarkingAll(true);

    try {
      const updatedSummary = await notificationService.markAllNotificationsAsRead();
      setSummary(updatedSummary);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: n.read_at || new Date().toISOString() }))
      );
      setToast({ message: 'All notifications marked as read', type: 'success' });
      triggerRefresh();
    } catch (err) {
      setToast({ message: err.message || 'Failed to mark all as read.', type: 'error' });
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleCreateNotification = async (payload) => {
    await notificationService.createNotification(payload);
    setToast({ message: 'Notification sent successfully', type: 'success' });
    triggerRefresh();
  };

  const handleConfirmDelete = async () => {
    if (!deleteNotificationObj) return;
    setIsDeleting(true);

    try {
      await notificationService.deleteNotification(deleteNotificationObj.id);
      setToast({ message: 'Notification removed', type: 'success' });
      setIsDeleteModalOpen(false);
      setDeleteNotificationObj(null);
      triggerRefresh();
    } catch (err) {
      setToast({ message: err.message || 'Failed to delete notification.', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const isAnyFilterActive = readFilter !== 'all' || typeFilter !== 'all';
  const displayedNotifications = notifications.slice(0, PAGE_SIZE);
  const hasNextPage = notifications.length > PAGE_SIZE;

  // Role subtitle determination
  const pageSubtitle = isAdmin(user)
    ? 'Organization notifications'
    : isManager(user)
    ? 'Team notifications'
    : 'Your notifications';

  return (
    <PageContainer
      title="Notifications"
      subtitle={pageSubtitle}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={triggerRefresh}
            isLoading={isRefreshing}
            disabled={isRefreshing || isLoading}
            title="Refresh notifications"
            className="shadow-xs"
          >
            <svg className="w-4 h-4 mr-1 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAll || summary.unread_count === 0}
            isLoading={isMarkingAll}
            className="shadow-xs"
          >
            <svg className="w-4 h-4 mr-1 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Mark All as Read</span>
          </Button>

          {isAdmin(user) && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="shadow-xs"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Send Alert</span>
            </Button>
          )}
        </div>
      }
    >
      {/* Toast */}
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 block">Unread Notifications</span>
              <span className="text-xl font-bold text-slate-900">{summary.unread_count}</span>
            </div>
          </div>
          {summary.unread_count > 0 ? (
            <Badge variant="indigo" size="md">Needs Review</Badge>
          ) : (
            <Badge variant="green" size="md">All Caught Up</Badge>
          )}
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 block">Total Activity Logs</span>
              <span className="text-xl font-bold text-slate-900">{summary.total_count}</span>
            </div>
          </div>
          <Badge variant="gray" size="md">Recorded</Badge>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Read/Unread Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-700">
            <span className="text-slate-400 font-medium">Status:</span>
            <select
              value={readFilter}
              onChange={(e) => handleFilterChange('is_read', e.target.value)}
              className="h-8 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              {READ_STATUS_OPTIONS.map((opt) => (
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
              className="h-8 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {isAnyFilterActive && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Notifications List Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Notification Feed</h2>
            <p className="text-xs text-slate-500 mt-0.5">Recent system alerts, call assignments, and callback reminders</p>
          </div>
          <Badge variant={isAnyFilterActive ? 'indigo' : 'gray'} size="sm">
            Page {currentPage + 1} {isAnyFilterActive && '(Filtered)'}
          </Badge>
        </div>

        {isLoading && !isRefreshing ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" />
            <p className="mt-3 text-xs font-medium text-slate-500">Loading notifications...</p>
          </div>
        ) : displayedNotifications.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={isAnyFilterActive ? 'No notifications match your current filters' : 'No notifications'}
              description={
                isAnyFilterActive
                  ? 'Try adjusting your read status or notification type filter.'
                  : "You're all caught up. New activity and reminders will appear here."
              }
              action={
                isAnyFilterActive ? (
                  <Button variant="outline" size="sm" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                ) : null
              }
            />
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {displayedNotifications.map((notif) => {
                const refPath = getReferencePath(notif.reference_type);
                const refLabel = formatReferenceLabel(notif.reference_type, notif.reference_id);

                return (
                  <div
                    key={notif.id}
                    className={`p-4 sm:p-5 transition-colors flex items-start justify-between gap-4 ${
                      !notif.is_read ? 'bg-indigo-50/30 hover:bg-indigo-50/50' : 'bg-white hover:bg-slate-50/70'
                    }`}
                  >
                    {/* Left: Indicator & Content */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      {/* Unread Status Dot */}
                      <div className="pt-1 shrink-0">
                        {!notif.is_read ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 block shadow-xs" title="Unread" />
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 block" title="Read" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <Badge variant={getNotificationTypeVariant(notif.notification_type)} size="sm">
                            <span className="mr-1">{getNotificationIcon(notif.notification_type)}</span>
                            <span>{formatNotificationType(notif.notification_type)}</span>
                          </Badge>

                          {refLabel && (
                            refPath ? (
                              <Link
                                to={refPath}
                                className="text-[11px] font-mono text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                              >
                                {refLabel}
                              </Link>
                            ) : (
                              <span className="text-[11px] font-mono text-slate-500 font-medium">
                                {refLabel}
                              </span>
                            )
                          )}

                          <span className="text-slate-400 text-xs ml-auto whitespace-nowrap" title={formatDateTime(notif.created_at)}>
                            {formatRelativeTime(notif.created_at)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setDetailsNotification(notif);
                            setIsDetailsModalOpen(true);
                            if (!notif.is_read) {
                              handleMarkAsRead(notif.id);
                            }
                          }}
                          className="font-bold text-sm text-slate-900 hover:text-indigo-600 text-left block transition-colors cursor-pointer"
                        >
                          {notif.title}
                        </button>

                        <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2">
                          {notif.message}
                        </p>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      {!notif.is_read && (
                        <button
                          onClick={() => handleMarkAsRead(notif.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Mark as Read"
                          aria-label="Mark as Read"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setDetailsNotification(notif);
                          setIsDetailsModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                        title="View Details"
                        aria-label="View Details"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>

                      <button
                        onClick={() => {
                          setDeleteNotificationObj(notif);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Notification"
                        aria-label="Delete Notification"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Footer */}
            <div className="px-4 sm:px-6 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Page <strong className="text-slate-800 font-semibold">{currentPage + 1}</strong>
                {displayedNotifications.length > 0 && ` (${displayedNotifications.length} items shown)`}
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

      {/* 1. Create Notification Modal (Admin Only) */}
      {isAdmin(user) && (
        <CreateNotificationModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateNotification}
        />
      )}

      {/* 2. Notification Details Modal */}
      <NotificationDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        notification={detailsNotification}
        onMarkAsRead={handleMarkAsRead}
      />

      {/* 3. Delete Confirmation Modal */}
      {deleteNotificationObj && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
          title="Delete Notification"
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
                {isDeleting ? 'Deleting...' : 'Delete Notification'}
              </Button>
            </>
          }
        >
          <div className="text-left text-sm text-slate-600 space-y-2">
            <p>
              Are you sure you want to delete this notification: <strong className="font-semibold text-slate-900">"{deleteNotificationObj.title}"</strong>?
            </p>
            <p className="text-xs text-slate-500">
              This action will dismiss this alert from your notification feed.
            </p>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
};

export default NotificationsPage;
