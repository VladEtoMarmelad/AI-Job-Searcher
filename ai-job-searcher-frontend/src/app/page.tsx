import { Vacancy } from "@sharedTypes/Vacancy";
import { FilterSidebar } from "@/components/FilterSidebar";
import { DescriptionToggle } from "@/components/DescriptionToggle";
import { UpdateDataButton } from "@/components/UpdateDataButton";
import { DeleteAllButton } from "@/components/DeleteAllButton";
import { VacancyList } from "@/components/VacancyList";
import axios from 'axios';

/**
 * Main entry point of the application.
 * Responsible for initial data fetching and high-level layout.
 */
export default async function HomePage({
  searchParams,
}: {
  /** The showDesc parameter determines if job descriptions are rendered in the cards */
  searchParams: Promise<{ score?: string; domain?: string; viewed?: string; showDesc?: string }>;
}) {
  const filters = await searchParams;
  let vacancies: Vacancy[] = [];
  let error: string | null = null;

  try {
    const response = await axios.get<Vacancy[]>('http://localhost:3030/db/vacancies');
    vacancies = response.data;
  } catch (err) {
    error = "Failed to load vacancies. Please make sure the API is running.";
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 border-b border-amber-500/30 pb-6">
          <h1 className="text-4xl font-bold text-amber-500 mb-2 tracking-tight">AI Job Searcher</h1>
        </header>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          <aside className="md:sticky md:top-8 w-full md:w-64 z-10 space-y-6 max-h-screen overflow-y-auto scrollbar-hide">
            <FilterSidebar filters={filters} />
            <DescriptionToggle showDesc={filters.showDesc} />
            <UpdateDataButton />
            <DeleteAllButton />
          </aside>
          
          {error ? (
            <div className="bg-red-900/20 border border-red-500 text-red-200 p-4 rounded-lg flex-1">
              {error}
            </div>
          ) : (
            <VacancyList 
              vacancies={vacancies} 
              filters={filters} 
              showDescription={filters.showDesc === 'true'} 
            />
          )}
        </div>
      </div>
    </main>
  );
}