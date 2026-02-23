import { Vacancy } from "@sharedTypes/Vacancy";
import { toggleVacancyViewedAction, deleteVacancyAction } from "@/actions/index";
import { DeleteButton } from './DeleteButton';

// Represents a single vacancy card with its status toggles and actions.
export const VacancyCard = ({ vacancy }: {vacancy: Vacancy}) => {
  // Pre-bind server action to vacancy specific data
  const toggleViewedWithId = toggleVacancyViewedAction.bind(null, vacancy._id ?? "", !!vacancy.viewed);

  return (
    <article 
      className={`group bg-slate-900 border border-gray-800 rounded-xl p-6 transition-all hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.1)] flex flex-col justify-between ${
        vacancy.viewed ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-2 items-center">
            <span className="bg-amber-500/10 text-amber-500 text-xs font-bold px-2 py-1 rounded border border-amber-500/20">
              Score: {vacancy.score.toFixed(1)}
            </span>
            
            <form action={toggleViewedWithId}>
              <button 
                type="submit"
                title={vacancy.viewed ? "Mark as unviewed" : "Mark as viewed"}
                className={`p-1 rounded transition-colors ${
                  vacancy.viewed ? 'text-amber-500 hover:bg-amber-500/10' : 'text-gray-600 hover:text-gray-400'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </form>
          </div>

          <DeleteButton id={vacancy._id ?? ""} onDelete={deleteVacancyAction} />
        </div>

        <details className="group/desc mb-6 cursor-pointer">
          <summary className="text-gray-300 text-sm leading-relaxed list-none">
            <p className="line-clamp-3 group-open/desc:hidden transition-colors group-hover:text-white">
              {vacancy.description}
            </p>
            <span className="text-amber-500 text-xs font-semibold mt-2 inline-block group-open/desc:hidden">
              Read full description...
            </span>
          </summary>
          <p className="text-gray-300 text-sm leading-relaxed pt-2 group-hover:text-white transition-colors">
            {vacancy.description}
          </p>
          <span className="text-amber-500 text-xs font-semibold mt-2 inline-block">Show less</span>
        </details>
      </div>

      <a 
        href={vacancy.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center w-full bg-transparent border border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black font-semibold py-2 px-4 rounded-lg transition-all duration-300"
      >
        View Vacancy
        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </article>
  );
}