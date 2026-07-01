import { useEffect, useState } from 'react';
import { MdSearch, MdWarning } from 'react-icons/md';
import { getItems } from '../../api/inventory';
import { getCategories } from '../../api/categories';

export default function MaterialsPage() {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');

  const load = () => {
    setLoading(true);
    const p = {};
    if (search) p.search = search;
    if (catFilter) p.categoryId = catFilter;
    getItems(p)
      .then(r => setItems(r.data.filter(item => item.isActive)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getCategories().then(r => setCats(r.data));
  }, []);

  useEffect(() => {
    load();
  }, [search, catFilter]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">List of Materials</h1>
          <p className="page-subtitle">Browse all active hospital supplies and pharmaceutical items available in inventory</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <MdSearch size={15} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-control" placeholder="Search by name or code…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 30 }} />
        </div>
        <select className="form-control" value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ minWidth: 180 }}>
          <option value="">All Categories</option>
          {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                <th>Item Name</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Supplies Available</th>
                <th>Availability</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No items found.</td></tr>
              ) : items.map(item => (
                <tr key={item.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{item.itemCode ?? '—'}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{item.name}</div>
                    {item.description && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.description}</div>}
                  </td>
                  <td>{item.categoryName}</td>
                  <td>{item.unit}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: item.isBelowReorder ? '#dc2626' : 'var(--text-primary)' }}>
                      {item.quantityOnHand} {item.unit}
                    </span>
                    {item.isBelowReorder && <MdWarning size={14} color="#f59e0b" style={{ marginLeft: 4 }} />}
                  </td>
                  <td>
                    {item.isAvailable ? (
                      <span className="badge badge-green">Available</span>
                    ) : (
                      <span className="badge badge-red">Not Available</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
