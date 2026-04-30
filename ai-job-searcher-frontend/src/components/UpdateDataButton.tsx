import { refreshAction } from "@/actions/index";

// Button to manually trigger a data refresh from the API
export const UpdateDataButton = () => {
  return (
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
  );
};
