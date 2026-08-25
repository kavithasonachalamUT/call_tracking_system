import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/common/LoadingSpinner';

/**
 * Role-based Route Guard supporting single role or array of allowed roles
 * e.g., <RoleRoute allowedRoles="admin"> or <RoleRoute allowedRoles={["admin", "manager"]}>
 */
export const RoleRoute = ({ allowedRoles = [], children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  // Normalize allowedRoles to an array of lowercase strings
  const normalizedAllowedRoles = Array.isArray(allowedRoles)
    ? allowedRoles.map((r) => String(r).toLowerCase())
    : [String(allowedRoles).toLowerCase()];

  const userRole = user?.role ? String(user.role).toLowerCase() : '';

  if (!user || (normalizedAllowedRoles.length > 0 && !normalizedAllowedRoles.includes(userRole))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default RoleRoute;
