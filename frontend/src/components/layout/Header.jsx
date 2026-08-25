import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../services/api';
import Badge from '../ui/Badge';
import { getRoleDisplayName, getRoleBadgeVariant, getUserProfileTag } from '../../utils/permissions';

export const Header = ({ onOpenSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState({ customers: [], calls: [] });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Fetch Unread Notification Count with lightweight periodic refresh
  useEffect(() => {
    let isMounted = true;

    const fetchSummary = () => {
      apiClient
        .get('/notifications/summary')
        .then((res) => {
          if (isMounted) {
            setUnreadCount(res.data?.unread_count || 0);
          }
        })
        .catch(() => {});
    };

    fetchSummary();
    const interval = setInterval(fetchSummary, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Global Keyboard Shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !searchInputRef.current?.contains(e.target)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search query handler
  useEffect(() => {
    const timer = setTimeout(async () => {
      const query = searchQuery.trim();
      if (!query) {
        setSearchResults({ customers: [], calls: [] });
        setIsDropdownOpen(false);
        return;
      }

      setIsSearching(true);
      try {
        const [customersRes, callsRes] = await Promise.allSettled([
          apiClient.get(`/customers?search=${encodeURIComponent(query)}&limit=4`),
          apiClient.get(`/calls?search=${encodeURIComponent(query)}&limit=4`),
        ]);

        const customers = customersRes.status === 'fulfilled' ? customersRes.value.data : [];
        const calls = callsRes.status === 'fulfilled' ? callsRes.value.data : [];

        setSearchResults({ customers, calls });
        setIsDropdownOpen(true);
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectResult = (path) => {
    setIsDropdownOpen(false);
    setSearchQuery('');
    navigate(path);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!val.trim()) {
      setIsDropdownOpen(false);
      setSearchResults({ customers: [], calls: [] });
    }
  };

  const totalResults = searchResults.customers.length + searchResults.calls.length;
  const roleDisplay = getRoleDisplayName(user?.role);
  const roleVariant = getRoleBadgeVariant(user?.role);
  const profileTag = getUserProfileTag(user);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left Area: Mobile Menu Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
          aria-label="Open Sidebar"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Center Area: Global Search Bar */}
      <div className="flex-1 max-w-lg mx-4 relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => {
              if (searchQuery.trim() && totalResults > 0) setIsDropdownOpen(true);
            }}
            placeholder="Search customers, calls, or numbers..."
            className="w-full pl-9 pr-14 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Search Results Dropdown */}
        {isDropdownOpen && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 text-left"
          >
            {isSearching ? (
              <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Searching records...</span>
              </div>
            ) : totalResults === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No matching customers or calls found for "{searchQuery}".
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {/* Customers Section */}
                {searchResults.customers.length > 0 && (
                  <div className="p-2">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Customers ({searchResults.customers.length})
                    </div>
                    {searchResults.customers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleSelectResult('/customers')}
                        className="w-full text-left px-2.5 py-2 hover:bg-indigo-50/50 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{c.name}</div>
                          <div className="text-[11px] text-slate-500">{c.phone} {c.company ? `• ${c.company}` : ''}</div>
                        </div>
                        <Badge variant="blue" size="sm">Customer</Badge>
                      </button>
                    ))}
                  </div>
                )}

                {/* Calls Section */}
                {searchResults.calls.length > 0 && (
                  <div className="p-2">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Calls ({searchResults.calls.length})
                    </div>
                    {searchResults.calls.map((call) => (
                      <button
                        key={call.id}
                        onClick={() => handleSelectResult('/calls')}
                        className="w-full text-left px-2.5 py-2 hover:bg-indigo-50/50 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">
                            Call #{call.id} • {call.direction?.toUpperCase()}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {call.subject || `Status: ${call.status}`}
                          </div>
                        </div>
                        <Badge variant={call.status === 'completed' ? 'green' : 'amber'} size="sm">
                          {call.status}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Area: Notification Icon, User Details, Quick Logout */}
      <div className="flex items-center gap-3.5">
        {/* Quick Notifications Link */}
        <Link
          to="/notifications"
          className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          title="Notifications"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-indigo-600 text-white font-bold text-[10px] rounded-full flex items-center justify-center shadow-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        {/* User Info Profile & Role */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
            {user?.name ? user.name.slice(0, 2) : 'U'}
          </div>

          <div className="hidden sm:flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-800 leading-tight">
                {user?.name || 'User'}
              </span>
              {profileTag && (
                <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                  {profileTag}
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-500 leading-tight">
              {user?.email || ''}
            </span>
          </div>

          <Badge variant={roleVariant} size="sm" className="hidden sm:inline-flex font-bold">
            {roleDisplay}
          </Badge>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
