import { NavLink } from 'react-router-dom';
import { MdSwapVert, MdTune } from 'react-icons/md';

// Stock Movements and Adjustments are two views of one thing — the history of
// every quantity change — so they share one sidebar entry and switch here.
export default function StockHistoryTabs() {
  return (
    <div className="sh-tabs">
      <style>{CSS}</style>
      <NavLink to="/stock-movements" className={({ isActive }) => `sh-tab${isActive ? ' on' : ''}`}>
        <MdSwapVert size={15} /> Movements
      </NavLink>
      <NavLink to="/stock-adjustments" className={({ isActive }) => `sh-tab${isActive ? ' on' : ''}`}>
        <MdTune size={15} /> Adjustments
      </NavLink>
    </div>
  );
}

const CSS = `
.sh-tabs { display: flex; gap: 4px; margin-bottom: 14px; border-bottom: 1px solid var(--border); }
.sh-tab { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--text-muted); padding: 10px 16px; text-decoration: none; border-bottom: 2px solid transparent; margin-bottom: -1px; }
.sh-tab:hover { color: var(--text-primary); }
.sh-tab.on { color: var(--text-accent, var(--green-600)); border-bottom-color: var(--green-500); }
`;
