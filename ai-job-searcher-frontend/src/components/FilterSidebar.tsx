interface FilterSidebarProps {
  filters: { 
    score?: string; 
    domain?: string; 
    viewed?: string;
  };
}

// Form with search filters for vacancies
export const FilterSidebar = ({ filters }: FilterSidebarProps) => {
  return (
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
  );
}