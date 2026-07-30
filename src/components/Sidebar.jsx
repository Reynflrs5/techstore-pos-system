import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Monitor,
  Package,
  Tags,
  Box,
  Users,
  FileText,
  BarChart2,
  Settings,
  LogOut,
  Cpu,
  ChevronLeft,
  Sun,
  Moon,
} from 'lucide-react';

const Sidebar = ({ userRole, onLogout, theme, onToggleTheme }) => {
  const [collapsed, setCollapsed] = useState(false);

  const adminGroups = [
    {
      label: 'Overview',
      links: [
        { path: '/dashboard', name: 'Dashboard', icon: <LayoutDashboard size={18} /> },
        { path: '/pos', name: 'Point of Sale', icon: <Monitor size={18} /> },
      ],
    },
    {
      label: 'Catalog',
      links: [
        { path: '/products', name: 'Products', icon: <Package size={18} /> },
        { path: '/categories', name: 'Categories', icon: <Tags size={18} /> },
        { path: '/inventory', name: 'Inventory', icon: <Box size={18} /> },
      ],
    },
    {
      label: 'Relationships',
      links: [
        { path: '/customers', name: 'Customers', icon: <Users size={18} /> },
        { path: '/sales', name: 'Sales', icon: <FileText size={18} /> },
      ],
    },
    {
      label: 'Insights',
      links: [{ path: '/reports', name: 'Reports', icon: <BarChart2 size={18} /> }],
    },
    {
      label: 'System',
      links: [{ path: '/settings', name: 'Settings', icon: <Settings size={18} /> }],
    },
  ];

  const cashierGroups = [
    {
      label: 'Workspace',
      links: [
        { path: '/pos', name: 'Point of Sale', icon: <Monitor size={18} /> },
        { path: '/customers', name: 'Customers', icon: <Users size={18} /> },
        { path: '/sales', name: 'Sales', icon: <FileText size={18} /> },
      ],
    },
  ];

  const groups = userRole === 'admin' ? adminGroups : cashierGroups;

  // running index across all groups so the stagger-in animation reads as
  // one continuous sequence rather than resetting per group
  let itemIndex = -1;

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Toggle sits at the aside's root level (not inside the clipped
          scroll container below) so it's never cut off mid-animation. */}
      <button
        type="button"
        className="collapse-toggle"
        onClick={() => setCollapsed((prev) => !prev)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ChevronLeft size={15} />
      </button>

      <div className="sidebar-inner">
        <div className="sidebar-header">
          <div className="logo-mark">
            <span className="logo-ring" aria-hidden="true" />
            <Cpu size={18} />
          </div>
          <div className="brand-block">
            <h2 className="brand-text">TechStore</h2>
            <span className="brand-sub">POS Terminal</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {groups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="group-label">{group.label}</span>
              {group.links.map((link) => {
                itemIndex += 1;
                return (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    style={{ animationDelay: `${itemIndex * 35}ms` }}
                    data-tooltip={link.name}
                  >
                    <span className="nav-icon">{link.icon}</span>
                    <span className="nav-label">{link.name}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card" style={{ display: 'flex', justifyContent: 'flex-start', gap: '10px', padding: '10px' }}>
            <div className="user-avatar" style={{ flexShrink: 0 }}>{userRole === 'admin' ? 'A' : 'S'}</div>
            <div className="user-profile-details" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '6px', position: 'static', transform: 'none', margin: 0 }}>
              <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>{userRole === 'admin' ? 'Administrator' : 'Staff Member'}</h4>
              <span className="role-badge" style={{ margin: 0 }}>{userRole}</span>
            </div>
          </div>

          <div className="status-line" aria-hidden="true">
            <span className="status-dot" />
            <span>System online</span>
          </div>

          {/* Theme Toggle - single button */}
          <button
            className="theme-btn"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            <span className="nav-label">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <button
            onClick={onLogout}
            className="logout-btn"
            data-tooltip="Logout"
            aria-label="Logout"
          >
            <LogOut size={16} />
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </div>

      <style>{`
        .sidebar {
          --sb-bg: #0a0c12;
          --sb-surface: #10131c;
          --sb-border: rgba(255, 255, 255, 0.07);
          --sb-text: #e9eaf2;
          --sb-text-dim: #7d8398;
          --sb-accent: #7c5cfc;
          --sb-accent-2: #22d3ee;
          --sb-accent-grad: linear-gradient(135deg, var(--sb-accent), var(--sb-accent-2));
          --sb-danger: #f87171;
          --sb-width-expanded: 272px;
          --sb-width-collapsed: 84px;

          width: var(--sb-width-expanded);
          height: 100vh;
          background:
            radial-gradient(560px 260px at 10% -8%, rgba(124, 92, 252, 0.16), transparent 65%),
            var(--sb-bg);
          border-right: 1px solid var(--sb-border);
          color: var(--sb-text);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          position: relative;
          overflow: visible;
          flex-shrink: 0;
          transition: width 340ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sidebar.collapsed {
          width: var(--sb-width-collapsed);
        }

        /* Everything that needs to clip long labels lives in here,
           kept separate from the toggle button above so the button
           is never affected by this container's overflow. */
        .sidebar-inner {
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .collapse-toggle {
          position: absolute;
          top: 28px;
          right: -13px;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 1px solid var(--sb-border);
          background: var(--sb-surface);
          color: var(--sb-text-dim);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
          z-index: 40;
          transition: transform 340ms cubic-bezier(0.4, 0, 0.2, 1),
            background-color 0.2s, color 0.2s, border-color 0.2s, box-shadow 0.2s;
        }
        .collapse-toggle:hover {
          color: #fff;
          background: var(--sb-accent);
          border-color: var(--sb-accent);
          box-shadow: 0 0 0 4px rgba(124, 92, 252, 0.18), 0 4px 14px rgba(124, 92, 252, 0.4);
        }
        .sidebar.collapsed .collapse-toggle {
          transform: rotate(180deg);
        }

        .sidebar-header {
          padding: 1.5rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.85rem;
          border-bottom: 1px solid var(--sb-border);
          min-height: 76px;
          box-sizing: border-box;
          flex-shrink: 0;
        }
        .logo-mark {
          position: relative;
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          background: #12141d;
          border: 1px solid var(--sb-border);
        }
        .logo-ring {
          position: absolute;
          inset: -3px;
          border-radius: 12px;
          padding: 1px;
          background: conic-gradient(from 0deg, var(--sb-accent), var(--sb-accent-2), var(--sb-accent));
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: spin 6s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .brand-block {
          display: flex;
          flex-direction: column;
          gap: 1px;
          opacity: 1;
          transition: opacity 140ms ease;
          overflow: hidden;
        }
        .sidebar.collapsed .brand-block {
          opacity: 0;
          width: 0;
        }
        .brand-text {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 700;
          letter-spacing: -0.01em;
          white-space: nowrap;
          color: var(--sb-text);
        }
        .brand-sub {
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--sb-text-dim);
          white-space: nowrap;
        }

        .sidebar-nav {
          flex: 1;
          padding: 1.1rem 0.75rem;
          overflow-y: auto;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
        }
        .sidebar-nav::-webkit-scrollbar {
          width: 5px;
        }
        .sidebar-nav::-webkit-scrollbar-thumb {
          background: var(--sb-border);
          border-radius: 4px;
        }

        .nav-group {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .group-label {
          padding: 0 0.75rem;
          margin-bottom: 0.35rem;
          font-size: 0.66rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--sb-text-dim);
          white-space: nowrap;
          opacity: 1;
          height: auto;
          transition: opacity 120ms ease;
        }
        .sidebar.collapsed .group-label {
          opacity: 0;
          height: 0;
          margin: 0;
          overflow: hidden;
        }

        .nav-item {
          position: relative;
          display: flex;
          align-items: center;
          padding: 0.62rem 0.85rem;
          border-radius: 9px;
          color: var(--sb-text-dim);
          text-decoration: none;
          gap: 0.85rem;
          font-weight: 500;
          font-size: 0.87rem;
          white-space: nowrap;
          opacity: 0;
          transform: translateX(-8px);
          animation: slideIn 340ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
          transition: background-color 0.2s ease, color 0.2s ease;
        }
        @keyframes slideIn {
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .nav-icon {
          display: flex;
          flex-shrink: 0;
        }
        .nav-item:hover {
          background-color: rgba(255, 255, 255, 0.045);
          color: var(--sb-text);
        }
        .nav-item.active {
          background: linear-gradient(to right, rgba(124, 92, 252, 0.16), rgba(124, 92, 252, 0.02));
          color: #fff;
          font-weight: 600;
        }
        .nav-item.active::before {
          content: '';
          position: absolute;
          left: 2px;
          top: 50%;
          transform: translateY(-50%);
          height: 60%;
          width: 3px;
          border-radius: 4px;
          background: var(--sb-accent-grad);
          box-shadow: 0 0 10px rgba(124, 92, 252, 0.7);
        }
        .nav-item.active .nav-icon {
          margin-left: 6px;
          color: var(--sb-accent-2);
        }

        /* Tooltips shown only while collapsed */
        .sidebar.collapsed .nav-item::after,
        .sidebar.collapsed .logout-btn::after {
          content: attr(data-tooltip);
          position: fixed;
          margin-left: calc(var(--sb-width-collapsed) + 12px);
          background: #16192380;
          background: #161923;
          border: 1px solid var(--sb-border);
          color: #fff;
          padding: 0.4rem 0.7rem;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 500;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s ease;
          z-index: 50;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.5);
        }
        .sidebar.collapsed .nav-item:hover::after,
        .sidebar.collapsed .logout-btn:hover::after {
          opacity: 1;
        }

        .nav-label {
          opacity: 1;
          transition: opacity 140ms ease;
        }
        .sidebar.collapsed .nav-label {
          opacity: 0;
          width: 0;
          overflow: hidden;
        }

        .sidebar-footer {
          padding: 1rem 0.85rem;
          border-top: 1px solid var(--sb-border);
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .user-card {
          display: flex;
          align-items: center;
          gap: 0;
          padding: 0.55rem 0.65rem;
          border-radius: 11px;
          background: var(--sb-surface);
          border: 1px solid var(--sb-border);
          overflow: hidden;
          position: relative;
        }
        .user-avatar {
          flex-shrink: 0;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--sb-accent-grad);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.8rem;
          color: #0a0c12;
          position: relative;
          z-index: 2;
        }
        .user-profile-details {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: flex-start;
          gap: 6px;
          margin-left: 10px; /* Explicit spacing from the avatar */
          white-space: nowrap;
          opacity: 1;
          transition: opacity 140ms ease;
        }
        .sidebar.collapsed .user-profile-details {
          opacity: 0;
          width: 0;
        }
        .user-profile-details h4 {
          font-size: 0.83rem;
          font-weight: 600;
          margin: 0;
          color: var(--sb-text);
          line-height: 1;
        }
        .role-badge {
          font-size: 0.5rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--sb-accent-2);
          background: rgba(34, 211, 238, 0.1);
          border: 1px solid rgba(34, 211, 238, 0.25);
          border-radius: 4px;
          padding: 2px 4px;
          line-height: 1;
        }

        .status-line {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0 0.15rem;
          font-size: 0.68rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          color: var(--sb-text-dim);
          white-space: nowrap;
          overflow: hidden;
        }
        .sidebar.collapsed .status-line {
          justify-content: center;
        }
        .sidebar.collapsed .status-line span:last-child {
          display: none;
        }
        .status-dot {
          flex-shrink: 0;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #34d399;
          box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.18);
          animation: pulse 2.2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.18); }
          50% { box-shadow: 0 0 0 5px rgba(52, 211, 153, 0.05); }
        }

        .logout-btn {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.6rem;
          border-radius: 9px;
          border: 1px solid var(--sb-border);
          background: transparent;
          color: var(--sb-danger);
          font-weight: 600;
          font-size: 0.83rem;
          cursor: pointer;
          transition: background-color 0.2s ease, border-color 0.2s ease;
        }
        .logout-btn:hover {
          background-color: rgba(248, 113, 113, 0.08);
          border-color: rgba(248, 113, 113, 0.35);
        }

        /* Theme toggle */
        .theme-toggle-row {
          display: flex;
          gap: 6px;
        }
        .theme-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0.5rem 0.4rem;
          border-radius: 8px;
          border: 1px solid var(--sb-border);
          background: transparent;
          color: var(--sb-text-dim);
          font-size: 0.78rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .theme-btn:hover {
          background: var(--sb-hover);
          color: var(--sb-text);
        }
        .theme-btn.active {
          background: var(--sb-accent-grad);
          color: #0a0c12;
          border-color: transparent;
          font-weight: 700;
        }
        .sidebar.collapsed .theme-btn span {
          display: none;
        }
        .sidebar.collapsed .theme-toggle-row {
          flex-direction: column;
        }

        @media (prefers-reduced-motion: reduce) {
          .sidebar, .nav-item, .brand-block, .nav-label, .user-details,
          .collapse-toggle, .logo-ring, .status-dot {
            transition: none !important;
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;