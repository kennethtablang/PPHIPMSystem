import { useEffect, useState } from 'react';
import { MdSearch, MdCheckCircle, MdCancel, MdWarning, MdInventory } from 'react-icons/md';
import { getItems } from '../../api/inventory';
import { getCategories } from '../../api/categories';

export default function MaterialsList() {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');

  const load = () => {
    setLoading(true);
    const p = {};
    if (search) p.search = search;
    if (catFilter) p.categoryId = catFilter;
    getItems(p)
      .then(r => setItems(r.data.filter(i => i.isActive)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { getCategories().then(r => setCats(r.data)); }, []);
  useEffect(() => { load(); }, [search, catFilter]);

  const filtered = items.filter(item => {
    if (availabilityFilter === 'available') return item.quantityOnHand > 0;
    if (availabilityFilter === 'unavailable') return item.quantityOnHand <= 0;
    return true;
  });

  const totalAvailable = items.filter(i => i.quantityOnHand > 0).length;
  const totalUnavailable = items.filter(i => i.quantityOnHand <= 0).length;
  const totalLowStock = items.filter(i => i.isBelowReorder).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">List of Materials</h1>
          <p className="page-subtitle">
            View availability and supply quantities for all active hospital materials and supplies
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid-stat" style={{ marginBottom: 24 }}>
        <div className="stat-card green">
          <div className="stat-icon green"><MdInventory size={20} /></div>
          <div className="stat-value">{items.length}</div>
          <div className="stat-label">Total Materials</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon green"><MdCheckCircle size={20} /></div>
          <div className="stat-value">{totalAvailable}</div>
          <div className="stat-label">Available</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon red"><MdCancel size={20} /></div>
          <div className="stat-value">{totalUnavailable}</div>
          <div className="stat-label">Not Available</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon amber"><MdWarning size={20} /></div>
          <div className="stat-value">{totalLowStock}</div>
          <div className="stat-label">Low Stock</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <MdSearch size={15} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="form-control"
            placeholder="Search by name or code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 30 }}
          />
        </div>
        <select className="form-control" value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ minWidth: 180 }}>
          <option value="">All Categories</option>
          {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="form-control" value={availabilityFilter} onChange={e => setAvailabilityFilter(e.target.value)} style={{ minWidth: 165 }}>
          <option value="">All Availability</option>
          <option value="available">✅ Available Only</option>
          <option value="unavailable">❌ Not Available Only</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Material Name</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Availability</th>
                <th style={{ textAlign: 'right' }}>Qty in Stock</th>
                <th style={{ textAlign: 'right' }}>Reorder At</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No materials found.
                  </td>
                </tr>
              ) : filtered.map(item => {
                const isAvailable = item.quantityOnHand > 0;
                const isLow = item.isBelowReorder;
                return (
                  <tr key={item.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>
                      {item.itemCode ?? '—'}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      {item.description && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.description}</div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-blue">{item.categoryName}</span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{item.unit}</td>
                    <td>
                      {isAvailable ? (
                        <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <MdCheckCircle size={12} /> Available
                        </span>
                      ) : (
                        <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <MdCancel size={12} /> Not Available
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: !isAvailable ? '#dc2626' : isLow ? '#d97706' : 'var(--text-primary)'
                      }}>
                        {item.quantityOnHand}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>{item.unit}</span>
                      {isLow && <MdWarning size={13} color="#f59e0b" style={{ marginLeft: 4, verticalAlign: 'middle' }} />}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 12 }}>
                      {item.reorderThreshold} {item.unit}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
