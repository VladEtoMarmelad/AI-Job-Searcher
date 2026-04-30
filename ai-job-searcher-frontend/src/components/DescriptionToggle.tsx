// Standalone toggle control for displaying job descriptions in vacancy cards
interface DescriptionToggleProps {
  showDesc?: string;
}

export const DescriptionToggle = ({ showDesc }: DescriptionToggleProps) => {
  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-gray-800">
      <h2 className="text-amber-500 font-bold mb-4 uppercase text-xs tracking-widest">Display Options</h2>
      <form method="GET" className="space-y-4">
        {/* Checkbox adds ?showDesc=true to the URL when checked */}
        <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            name="showDesc" 
            id="showDesc"
            value="true"
            defaultChecked={showDesc === 'true'}
            className="w-4 h-4 rounded border-gray-700 bg-slate-950 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900"
          />
          <label htmlFor="showDesc" className="text-xs text-gray-400 cursor-pointer select-none">
            Show Descriptions
          </label>
        </div>
        <button 
          type="submit"
          className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/50 font-bold py-2 rounded-lg transition-all text-sm"
        >
          Apply
        </button>
      </form>
    </div>
  );
};
