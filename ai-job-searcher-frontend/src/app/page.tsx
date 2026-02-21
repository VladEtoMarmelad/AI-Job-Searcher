import { Vacancy } from "@sharedTypes/Vacancy"
import { revalidatePath } from 'next/cache';
import axios from 'axios';

/* Server Action that triggers a data re-fetch by invalidating the current path's cache */
async function refreshAction() {
  'use server';
  revalidatePath('/');
}

// Updated HomePage to accept searchParams for filtering
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ score?: string; domain?: string }>;
}) {
  // Await searchParams in Next.js 15+
  const filters = await searchParams;
  const minScore = parseFloat(filters.score || "0");
  const domainQuery = filters.domain?.toLowerCase() || "";

  let vacancies: Vacancy[] = [];
  let error: string | null = null;

  try {
    const response = await axios.get<Vacancy[]>('http://localhost:3030/db/vacancies');
    vacancies = response.data;
  } catch (err) {
    error = "Failed to load vacancies. Please make sure the API is running.";
    console.error("Data fetching error:", err);
  }

  // Filter vacancies based on score and domain (search in URL or specific domain field if exists)
  const filteredVacancies = vacancies.filter((vacancy) => {
    const matchesScore = vacancy.score >= minScore;
    // Checks if domain matches the vacancy's URL or a 'domain' property if available
    const matchesDomain = domainQuery 
      ? vacancy.url.toLowerCase().includes(domainQuery) || (vacancy as any).domain?.toLowerCase().includes(domainQuery)
      : true;
    
    return matchesScore && matchesDomain;
  });

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 border-b border-amber-500/30 pb-6">
          <h1 className="text-4xl font-bold text-amber-500 mb-2 tracking-tight">
            AI Job Searcher
          </h1>
        </header>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Sidebar with Filters and Refresh */}
          <aside className="md:sticky md:top-8 w-full md:w-64 z-10 space-y-6">
            
            {/* Filter Form: Uses standard GET method to update URL parameters */}
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
                <button 
                  type="submit"
                  className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/50 font-bold py-2 rounded-lg transition-all text-sm"
                >
                  Apply Filters
                </button>
              </form>
            </div>

            {/* Refresh Action Button */}
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

          <section className="flex-1">
            {/* VACANCY COUNT DISPLAY: Shows the number of results found after filtering */}
            {!error && (
              <div className="mb-6 flex justify-between items-end border-b border-gray-800 pb-4">
                <p className="text-gray-400 text-sm">
                  Found <span className="text-amber-500 font-bold text-lg leading-none">{filteredVacancies.length}</span> vacancies
                </p>
                {(filters.score || filters.domain) && (
                  <a href="/" className="text-xs text-gray-500 hover:text-amber-500 transition-colors uppercase tracking-widest font-bold">
                    ✕ Clear Filters
                  </a>
                )}
              </div>
            )}

            {error ? (
              <div className="bg-red-900/20 border border-red-500 text-red-200 p-4 rounded-lg">
                {error}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredVacancies.map((vacancy) => (
                  <article 
                    key={vacancy._id} 
                    className="group bg-slate-900 border border-gray-800 rounded-xl p-6 transition-all hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.1)] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className="bg-amber-500/10 text-amber-500 text-xs font-bold px-2 py-1 rounded border border-amber-500/20">
                          Score: {vacancy.score.toFixed(1)}
                        </span>
                        <span className="text-gray-600 text-[10px] uppercase tracking-widest font-mono">
                          ID: {vacancy._id?.slice(-6)}
                        </span>
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
                        <span className="text-amber-500 text-xs font-semibold mt-2 inline-block">
                          Show less
                        </span>
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
                ))}
              </div>
            )}

            {/* Empty state handler for filtered results */}
            {!error && filteredVacancies.length === 0 && (
              <div className="text-center py-20 bg-slate-900/50 rounded-xl border border-dashed border-gray-800">
                <p className="text-gray-500 text-lg italic">No vacancies match your filters...</p>
                <a href="/" className="text-amber-500 text-sm mt-2 inline-block hover:underline">Clear all filters</a>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}