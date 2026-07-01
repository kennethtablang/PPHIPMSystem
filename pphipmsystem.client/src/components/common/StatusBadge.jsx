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
  SubmittedToProcurement: 'Submitted',
  ApprovedByProcurement: 'Proc. Approved',
  ApprovedByInventoryOfficer: 'Inv. Approved',
  ReturnedForRevision: 'Returned',
  FullyApproved: 'Approved',
  PurchaseOrderGenerated: 'PO Generated',
};

export default function StatusBadge({ status }) {
  const color = STATUS_MAP[String(status)] ?? 'gray';
  const label = LABEL_MAP[status] ?? status;
  return <span className={`badge badge-${color}`}>{label}</span>;
}
