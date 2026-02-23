import { Vacancy } from "@sharedTypes/Vacancy";
import { VacancyCard } from "./VacancyCard";

interface VacancyListProps {
  vacancies: Vacancy[];
  filters: { score?: string; domain?: string; viewed?: string };
}

// Filters the list based on user criteria and renders the results grid.
export const VacancyList = ({ vacancies, filters }: VacancyListProps) => {
  const minScore = parseFloat(filters.score || "0");
  const domainQuery = filters.domain?.toLowerCase() || "";
  const viewedFilter = filters.viewed;

  const filteredVacancies = vacancies.filter((vacancy) => {
    const matchesScore = vacancy.score >= minScore;
    const matchesDomain = domainQuery 
      ? vacancy.url.toLowerCase().includes(domainQuery) || (vacancy as any).domain?.toLowerCase().includes(domainQuery)
      : true;

    const isViewed = !!vacancy.viewed;
    let matchesStatus = true;
    if (viewedFilter === 'viewed') matchesStatus = isViewed === true;
    if (viewedFilter === 'unviewed') matchesStatus = isViewed === false;
    
    return matchesScore && matchesDomain && matchesStatus;
  });

  return (
    <section className="flex-1">
      <div className="mb-6 flex justify-between items-end border-b border-gray-800 pb-4">
        <p className="text-gray-400 text-sm">
          Found <span className="text-amber-500 font-bold text-lg leading-none">{filteredVacancies.length}</span> vacancies
        </p>
        {(filters.score || filters.domain || filters.viewed) && (
          <a href="/" className="text-xs text-gray-500 hover:text-amber-500 transition-colors uppercase tracking-widest font-bold">
            ✕ Clear Filters
          </a>
        )}
      </div>

      {filteredVacancies.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 rounded-xl border border-dashed border-gray-800">
          <p className="text-gray-500 text-lg italic">No vacancies match your filters...</p>
          <a href="/" className="text-amber-500 text-sm mt-2 inline-block hover:underline">Clear all filters</a>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredVacancies.map((vacancy) => (
            <VacancyCard key={vacancy._id} vacancy={vacancy} />
          ))}
        </div>
      )}
    </section>
  );
}