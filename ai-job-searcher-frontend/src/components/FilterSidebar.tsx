import { refreshAction } from "@/actions/index";

interface FilterSidebarProps {
  filters: { 
    score?: string; 
    domain?: string; 
    viewed?: string 
  };
}

// Left-side navigation containing the search filter form and manual data refresh button.
export const FilterSidebar = ({ filters }: FilterSidebarProps) => {
  return (
    <aside className="md:sticky md:top-8 w-full md:w-64 z-10 space-y-6">
      <div className="bg-slate-900 p-6 rounded-xl border border-gray-800">
        <h2 className="text-amber-500 font-bold mb-4 uppercase text-xs tracking-widest">Filters</h2>
        <form method="GET" className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Minimum Score</label>
            <input 
              type="number" 
              name="score" 
              step="0.1"
              defaultValue={filters.score}
              placeholder="0.0"
              className="w-full bg-slate-950 border border-gray-700 rounded px-3 py-2 text-sm focus:border-amber-500 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Domain</label>
            <input 
              type="text" 
              name="domain" 
              defaultValue={filters.domain}
              placeholder="e.g. djinni.co"
              className="w-full bg-slate-950 border border-gray-700 rounded px-3 py-2 text-sm focus:border-amber-500 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Status</label>
            <select 
              name="viewed"
              defaultValue={filters.viewed || ""}
              className="w-full bg-slate-950 border border-gray-700 rounded px-3 py-2 text-sm focus:border-amber-500 outline-none transition-colors appearance-none"
            >
              <option value="">All Statuses</option>
              <option value="unviewed">Not Viewed Only</option>
              <option value="viewed">Viewed Only</option>
            </select>
          </div>
          <button 
            type="submit"
            className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/50 font-bold py-2 rounded-lg transition-all text-sm"
          >
            Apply Filters
          </button>
        </form>
      </div>

      <form action={refreshAction}>
        <button 
          type="submit"
          className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg shadow-amber-500/20 whitespace-nowrap"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Update Data
        </button>
      </form>
    </aside>
  );
}