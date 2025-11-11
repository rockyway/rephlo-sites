import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface FilterState {
  [key: string]: any;
}

interface AdminUIState {
  // Sidebar state
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  // Breadcrumbs
  breadcrumbs: Breadcrumb[];
  setBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void;

  // Active filters (per page)
  activeFilters: Record<string, FilterState>;
  setPageFilters: (page: string, filters: FilterState) => void;
  clearPageFilters: (page: string) => void;
  clearAllFilters: () => void;
}

export const useAdminUIStore = create<AdminUIState>()(
  persist(
    (set) => ({
      // Initial sidebar state (expanded on desktop)
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      // Initial breadcrumbs
      breadcrumbs: [{ label: 'Dashboard', href: '/admin' }],
      setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),

      // Initial filter state
      activeFilters: {},
      setPageFilters: (page, filters) =>
        set((state) => ({
          activeFilters: {
            ...state.activeFilters,
            [page]: filters,
          },
        })),
      clearPageFilters: (page) =>
        set((state) => {
          const { [page]: _, ...rest } = state.activeFilters;
          return { activeFilters: rest };
        }),
      clearAllFilters: () => set({ activeFilters: {} }),
    }),
    {
      name: 'admin-ui-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist sidebar state and filters (not breadcrumbs)
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        activeFilters: state.activeFilters,
      }),
    }
  )
);
