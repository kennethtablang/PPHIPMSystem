const STATUS_MAP = {
  // Procurement
  Draft: 'gray',
  SubmittedToProcurement: 'blue',
  ApprovedByProcurement: 'teal',
  ReturnedForRevision: 'amber',
  Rejected: 'red',
  FullyApproved: 'green',
  PurchaseOrderGenerated: 'purple',
  Delivered: 'green',
  Cancelled: 'gray',
  SubmittedByDepartment: 'gray',
  ApprovedByInventoryOfficer: 'purple',
  Released: 'green',
  // Adjustments
  Pending: 'amber',
  Approved: 'green',
  // Stock movement
  Receipt: 'green',
  Issuance: 'blue',
  Return: 'teal',
  Disposal: 'red',
  Adjustment: 'amber',
  // Accreditation
  true: 'green',
  false: 'red',
};

const LABEL_MAP = {
  SubmittedByDepartment: 'Draft / Dept. Request',
  SubmittedToProcurement: 'Inventory Review',
  ApprovedByProcurement: 'Inventory Review',
  ApprovedByInventoryOfficer: 'Admin Approval',
  ReturnedForRevision: 'Returned',
  FullyApproved: 'Awaiting Stock',
  Released: 'Released',
  PurchaseOrderGenerated: 'PO Generated',
};

// A replenishment Purchase Request skips inventory review: once submitted it
// waits on the Chief (Administrator), and once approved it waits on a PO.
const REPLENISHMENT_LABELS = {
  SubmittedToProcurement: 'For Chief Approval',
  FullyApproved: 'Approved – for PO',
};

export default function StatusBadge({ status, type }) {
  const color = STATUS_MAP[String(status)] ?? 'gray';
  const label = (type === 'Replenishment' && REPLENISHMENT_LABELS[status]) || LABEL_MAP[status] || status;
  return <span className={`badge badge-${color}`}>{label}</span>;
}
