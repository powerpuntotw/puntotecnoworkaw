/**
 * src/services/AccessService.js
 * Centraliza el control de acceso y validación de roles en la aplicación.
 */

export const ROLES = {
    ADMIN: 'admin',
    LOCAL: 'local',
    CLIENT: 'client'
};

// Mapa estático de permisos por módulo
const MODULE_PERMISSIONS = {
    [ROLES.ADMIN]: [
        'dashboard', 'dashboard_admin', 'users_admin', 'locations_admin', 'orders_global', 
        'rewards_global', 'reports_admin', 'maintenance_admin', 'branding_admin', 
        'audit_admin', 'support_tickets', 'rewards_catalog'
    ],
    [ROLES.LOCAL]: [
        'dashboard', 'dashboard_local', 'orders_local', 'customers_local', 'prices_local', 
        'redeems_local', 'rewards_local', 'support_tickets'
    ],
    [ROLES.CLIENT]: [
        'dashboard', 'dashboard_client', 'new_order', 'order_history', 'rewards_catalog', 'support_tickets'
    ]
};

export const AccessService = {
    /**
     * Comprueba si un usuario tiene un rol específico.
     */
    isRole: (user, role) => user?.user_type === role,

    /**
     * Comprobaciones rápidas de rol.
     */
    isAdmin: (user) => user?.user_type === ROLES.ADMIN,
    isOperator: (user) => user?.user_type === ROLES.LOCAL,
    isLocal: (user) => user?.user_type === ROLES.LOCAL,
    isClient: (user) => !user?.user_type || user?.user_type === ROLES.CLIENT,

    /**
     * Valida si un usuario tiene acceso a un módulo específico.
     */
    canAccessModule: (user, moduleName) => {
        const role = user?.user_type || ROLES.CLIENT;
        const permissions = MODULE_PERMISSIONS[role] || [];
        // El admin suele tener acceso a casi todo, pero lo manejamos vía el mapa para mayor control
        return permissions.includes(moduleName);
    },

    /**
     * Valida si el usuario actual es dueño o responsable de un recurso.
     */
    isOwner: (user, resourceClientId) => {
        if (!user?.$id || !resourceClientId) return false;
        return user.$id === resourceClientId;
    },

    /**
     * Determina si el usuario puede gestionar una sucursal específica.
     */
    canManageLocation: (user, locationId) => {
        if (AccessService.isAdmin(user)) return true;
        return AccessService.isOperator(user) && user?.location_id === locationId;
    }
};
