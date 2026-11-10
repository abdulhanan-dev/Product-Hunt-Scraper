import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { api } from './services/api';

// Reusable Components
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import CommandPalette from './components/CommandPalette';
import ScraperTerminalModal from './components/ScraperTerminalModal';
import ContaboServerModal from './components/ContaboServerModal';

// Dedicated Pages (Separate Full Page Views!)
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import PersonsPage from './pages/PersonsPage';
import PersonDetailPage from './pages/PersonDetailPage';
import HistoryPage from './pages/HistoryPage';

function AppContent() {
  // Navigation & Page State
  const [page, setPage] = useState('dashboard');
  const [activeProduct, setActiveProduct] = useState(null);
  const [activeUsername, setActiveUsername] = useState(null);

  // Layout State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('launchbase_sidebar_collapsed') === 'true';
  });

  // Modal States
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);

  // Data States
  const [stats, setStats] = useState(null);
  const [dates, setDates] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem('launchbase_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Handle URL Hash Routing (Deep-linking & Browser Back/Forward support!)
  const parseHash = useCallback(() => {
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (!hash || hash === 'dashboard') {
      setPage('dashboard');
      setActiveProduct(null);
      setActiveUsername(null);
    } else if (hash === 'products') {
      setPage('products');
      setActiveProduct(null);
    } else if (hash.startsWith('product/')) {
      const parts = hash.slice('product/'.length).split('/');
      const slug = decodeURIComponent(parts[0]);
      const initialTab = parts[1] || 'overview';
      setPage('product-detail');
      setActiveProduct((prev) => ({
        ...(prev?.product_slug === slug || prev?.post_slug === slug ? prev : { product_slug: slug, post_slug: slug, name: slug }),
        initialTab,
      }));
    } else if (hash === 'persons' || hash === 'people') {
      setPage('persons');
      setActiveUsername(null);
    } else if (hash.startsWith('person/')) {
      const username = decodeURIComponent(hash.slice('person/'.length));
      setPage('person-detail');
      setActiveUsername(username);
    } else if (hash === 'history') {
      setPage('history');
      setActiveProduct(null);
      setActiveUsername(null);
    }
  }, []);

  // Sync hash on mount and hashchange
  useEffect(() => {
    parseHash();
    window.addEventListener('hashchange', parseHash);
    return () => window.removeEventListener('hashchange', parseHash);
  }, [parseHash]);

  // Global Navigation function
  const navigateTo = useCallback((targetPage, param = null) => {
    if (targetPage === 'product-detail') {
      const slug = typeof param === 'string' ? param : param?.product_slug || param?.post_slug || param?.slug;
      const initialTab = typeof param === 'object' && param?.initialTab ? param.initialTab : 'overview';
      setActiveProduct(typeof param === 'object' ? param : { product_slug: slug, post_slug: slug, initialTab });
      setPage('product-detail');
      window.location.hash = `/product/${encodeURIComponent(slug)}${initialTab !== 'overview' ? `/${initialTab}` : ''}`;
    } else if (targetPage === 'person-detail') {
      const username = typeof param === 'string' ? param : param?.username;
      setActiveUsername(username);
      setPage('person-detail');
      window.location.hash = `/person/${encodeURIComponent(username)}`;
    } else {
      setPage(targetPage);
      setActiveProduct(null);
      setActiveUsername(null);
      window.location.hash = `/${targetPage}`;
    }
    api.sendClientLog('INFO', `Navigated to page: ${targetPage}${param ? ` (${typeof param === 'string' ? param : param?.name || param?.slug || ''})` : ''}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Keyboard shortcut for Command Palette (⌘K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load Initial API Data
  useEffect(() => {
    setLoadingInitial(true);
    Promise.all([api.getStats(), api.getDates()])
      .then(([statsData, datesData]) => {
        setStats(statsData);
        const dateList = (datesData.dates || []).map((d) => d.date);
        setDates(dateList);

        // Fetch top products for the most recent date
        if (dateList.length > 0) {
          api
            .getProducts({ date: dateList[0], limit: 30, sort: 'rank' })
            .then((res) => setTopProducts(res.products || []))
            .catch(() => {});
        }

        // Fetch initial profiles for command palette search
        api
          .getProfiles({ limit: 40 })
          .then((res) => setAllProfiles(res.profiles || []))
          .catch(() => {});
      })
      .catch((err) => {
        console.warn('Initial data load error:', err);
      })
      .finally(() => setLoadingInitial(false));
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans transition-colors duration-200">
      {/* Improved Collapsible Sidebar */}
      <Sidebar
        page={page}
        onNavigate={navigateTo}
        stats={stats}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onOpenScraper={() => setIsTerminalOpen(true)}
        onOpenServer={() => setIsServerModalOpen(true)}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Modern Glass Topbar */}
        <Topbar
          page={page}
          activeItem={page === 'product-detail' ? activeProduct : activeUsername}
          onNavigate={navigateTo}
          onOpenCommandPalette={() => setIsCommandOpen(true)}
          onOpenScraper={() => setIsTerminalOpen(true)}
          onOpenServer={() => setIsServerModalOpen(true)}
        />

        {/* Scrollable Main Stage */}
        <main className="flex-1 overflow-y-auto">
          {page === 'dashboard' && (
            <DashboardPage
              stats={stats}
              topProducts={topProducts}
              loading={loadingInitial}
              onNavigate={navigateTo}
              onSelectProduct={(p) => navigateTo('product-detail', p)}
            />
          )}

          {page === 'products' && (
            <ProductsPage
              dates={dates}
              onSelectProduct={(p) => navigateTo('product-detail', p)}
            />
          )}

          {page === 'product-detail' && (
            <ProductDetailPage
              product={activeProduct}
              onBack={() => navigateTo('products')}
              onSelectPerson={(username) => navigateTo('person-detail', username)}
            />
          )}

          {page === 'persons' && (
            <PersonsPage
              onSelectPerson={(username) => navigateTo('person-detail', username)}
            />
          )}

          {page === 'person-detail' && (
            <PersonDetailPage
              username={activeUsername}
              onBack={() => navigateTo('persons')}
              onSelectProduct={(p) => navigateTo('product-detail', p)}
            />
          )}

          {page === 'history' && <HistoryPage />}
        </main>
      </div>

      {/* Command Palette (⌘K) */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        products={topProducts}
        people={allProfiles}
        onSelectProduct={(p) => navigateTo('product-detail', p)}
        onSelectPerson={(username) => navigateTo('person-detail', username)}
        onNavigate={navigateTo}
      />

      {/* Scraper Terminal Modal */}
      <ScraperTerminalModal
        isOpen={isTerminalOpen}
        onClose={() => setIsTerminalOpen(false)}
      />

      {/* Contabo Server Infrastructure Modal */}
      <ContaboServerModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
