/**
 * Centralized Role-Based Access Control (RBAC) & Permission Utilities
 * Handles 'admin', 'manager', and 'agent' roles safely without duplication.
 */

/**
 * Check if the user has the 'admin' role (organization-wide management).
 * @param {{ role?: string } | null | undefined} user
 * @returns {boolean}
 */
export const isAdmin = (user) => {
  return Boolean(user && user.role === 'admin');
};

/**
 * Check if the user has the 'manager' role (team-level management).
 * @param {{ role?: string } | null | undefined} user
 * @returns {boolean}
 */
export const isManager = (user) => {
  return Boolean(user && user.role === 'manager');
};

/**
 * Check if the user has the 'agent' role (self-scoped workspace).
 * @param {{ role?: string } | null | undefined} user
 * @returns {boolean}
 */
export const isAgent = (user) => {
  return Boolean(user && user.role === 'agent');
};

/**
 * Check if the user is either an Admin or a Manager (team / oversight level).
 * @param {{ role?: string } | null | undefined} user
 * @returns {boolean}
 */
export const isAdminOrManager = (user) => {
  return Boolean(user && (user.role === 'admin' || user.role === 'manager'));
};

/**
 * Check if the user has permission to access Admin-only features.
 * @param {{ role?: string } | null | undefined} user
 * @returns {boolean}
 */
export const canAccessAdminFeatures = (user) => {
  return isAdmin(user);
};

/**
 * Check if the user has permission to manage or monitor team activities.
 * @param {{ role?: string } | null | undefined} user
 * @returns {boolean}
 */
export const canManageTeam = (user) => {
  return isAdminOrManager(user);
};

/**
 * Check if the user can reassign calls (Admin or Manager).
 * @param {{ role?: string } | null | undefined} user
 * @returns {boolean}
 */
export const canReassignCalls = (user) => {
  return isAdminOrManager(user);
};

/**
 * Get standardized uppercase display name for a role string.
 * @param {string | null | undefined} role
 * @returns {string}
 */
export const getRoleDisplayName = (role) => {
  if (!role) return 'AGENT';
  switch (role.toLowerCase()) {
    case 'admin':
      return 'ADMIN';
    case 'manager':
      return 'MANAGER';
    case 'agent':
      return 'AGENT';
    default:
      return role.toUpperCase();
  }
};

/**
 * Get badge UI color variant for a role.
 * @param {string | null | undefined} role
 * @returns {'purple' | 'blue' | 'gray'}
 */
export const getRoleBadgeVariant = (role) => {
  if (!role) return 'gray';
  switch (role.toLowerCase()) {
    case 'admin':
      return 'purple';
    case 'manager':
      return 'blue';
    case 'agent':
      return 'gray';
    default:
      return 'gray';
  }
};

/**
 * Get role-scoped dashboard title.
 * @param {{ role?: string } | null | undefined} user
 * @returns {string}
 */
export const getDashboardTitle = (user) => {
  if (isAdmin(user)) return 'Organization Dashboard';
  if (isManager(user)) return 'Team Dashboard';
  return 'My Dashboard';
};

/**
 * Get role-scoped analytics label.
 * @param {{ role?: string } | null | undefined} user
 * @returns {string}
 */
export const getAnalyticsScopeLabel = (user) => {
  if (isAdmin(user)) return 'Organization Analytics';
  if (isManager(user)) return 'Team Analytics';
  return 'My Analytics';
};

/**
 * Get role-scoped reports label.
 * @param {{ role?: string } | null | undefined} user
 * @returns {string}
 */
export const getReportsScopeLabel = (user) => {
  if (isAdmin(user)) return 'Organization Reports';
  if (isManager(user)) return 'Team Reports';
  return 'My Reports';
};

/**
 * Get role-scoped audit logs label.
 * @param {{ role?: string } | null | undefined} user
 * @returns {string}
 */
export const getAuditLogsScopeLabel = (user) => {
  if (isAdmin(user)) return 'Organization Audit Logs';
  if (isManager(user)) return 'Team Activity Logs';
  return 'My Activity';
};

/**
 * Get user profile role tag / description.
 * @param {{ role?: string, manager_id?: number | null } | null | undefined} user
 * @returns {string | null}
 */
export const getUserProfileTag = (user) => {
  if (!user) return null;
  if (isManager(user)) return 'Team Manager';
  if (isAdmin(user)) return 'Organization Admin';
  if (isAgent(user) && user.manager_id) return 'Reports to Manager';
  return null;
};
