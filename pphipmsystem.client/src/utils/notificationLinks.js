import {
  MdWarning, MdError, MdInfo, MdCheckCircle, MdShoppingCart, MdLocalShipping,
  MdTune, MdDeleteForever, MdReportProblem,
} from 'react-icons/md';

// Shared look for a notification type — the bell panel, pop-ups and the
// Notifications page all use it. Keys must match `NotificationType` on the server.
export const TYPE_META = {
  LowStock:                       { icon: MdWarning,       color: '#f59e0b', label: 'Low Stock Alert',          group: 'inventory' },
  ExpirationWarning:              { icon: MdWarning,       color: '#f59e0b', label: 'Expiration Warning',       group: 'inventory' },
  StockAdjustmentRequested:       { icon: MdTune,          color: '#3b82f6', label: 'Adjustment',               group: 'inventory' },
  StockAdjustmentApproved:        { icon: MdCheckCircle,   color: '#059669', label: 'Adjustment Applied',       group: 'inventory' },
  StockAdjustmentRejected:        { icon: MdDeleteForever, color: '#dc2626', label: 'Adjustment Rejected',      group: 'inventory' },
  ProcurementSubmitted:           { icon: MdShoppingCart,  color: '#3b82f6', label: 'New Request',              group: 'procurement' },
  ProcurementApproved:            { icon: MdCheckCircle,   color: '#059669', label: 'Request Approved',         group: 'procurement' },
  ProcurementRejected:            { icon: MdError,         color: '#dc2626', label: 'Request Rejected',         group: 'procurement' },
  ProcurementReturnedForRevision: { icon: MdInfo,          color: '#f59e0b', label: 'Returned for Revision',    group: 'procurement' },
  PurchaseOrderGenerated:         { icon: MdLocalShipping, color: '#059669', label: 'Purchase Order',           group: 'procurement' },
  DeliveryProblem:                { icon: MdReportProblem, color: '#dc2626', label: 'Delivery Problem',         group: 'procurement' },
  General:                        { icon: MdInfo,          color: '#6b7280', label: 'Notice',                   group: 'other' },
};

export const metaFor = type => TYPE_META[type] ?? { icon: MdInfo, color: '#6b7280', label: type, group: 'other' };

const DEPT_ROLES = ['DepartmentHead', 'DepartmentStaff'];

// Where clicking a notification takes the user: straight to the record it is
// about, opened (the page reads `?open=<id>`). Department accounts see their
// requests on their own page.
export function notificationLink(n, role) {
  const id = n?.referenceId;
  const q = id != null ? `?open=${id}` : '';
  const dept = DEPT_ROLES.includes(role);
  switch (n?.referenceType) {
    case 'ProcurementRequest': return (dept ? '/department-requests' : '/procurement') + q;
    case 'PurchaseOrder':      return dept ? '/department-requests' : '/purchase-orders' + q;
    case 'InventoryItem':      return dept ? '/materials' : '/inventory' + q;
    case 'ItemBatch':          return '/batches' + q;
    case 'StockAdjustment':    return '/stock-adjustments';
    default:                   return '/notifications';
  }
}

// Which sidebar entry a notification's record type badges.
export const SECTION_BY_REFERENCE = {
  ProcurementRequest: 'requests',
  PurchaseOrder: 'purchase-orders',
  InventoryItem: 'items',
  ItemBatch: 'batches',
  StockAdjustment: 'stock-history',
};

export function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-PH');
}
