/**
 * Restrict route to users with one of the allowed staff roles.
 * Must run after auth middleware (req.user._id set; DB user loaded preferred).
 *
 * Usage: requireRole('owner'), requireRole('owner', 'admin')
 */
module.exports = function requireRole(...allowedRoles) {
  return function (req, res, next) {
    const role = req.user?.role;
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({
        message: "Insufficient permissions",
        code: "FORBIDDEN_ROLE",
        requiredRoles: allowedRoles,
      });
    }
    return next();
  };
};
