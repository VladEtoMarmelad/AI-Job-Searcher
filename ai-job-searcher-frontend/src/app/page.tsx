import { Vacancy } from "@sharedTypes/Vacancy"
import { revalidatePath } from 'next/cache';
import axios from 'axios';

/* Server Action that triggers a data re-fetch by invalidating the current path's cache */
async function refreshAction() {
  'use server';
  revalidatePath('/');
}

// Server Component to fetch and display vacancies
export default async function HomePage() {
  let vacancies: Vacancy[] = [];
  let error: string | null = null;

  try {
    // Fetch data using axios from the local API
    const response = await axios.get<Vacancy[]>('http://localhost:3030/db/vacancies');
    vacancies = response.data;
  } catch (err) {
    // Handle potential connection or API errors
    error = "Failed to load vacancies. Please make sure the API is running.";
    console.error("Data fetching error:", err);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header section with Gold accent */}
        <header className="mb-12 border-b border-amber-500/30 pb-6">
          <h1 className="text-4xl font-bold text-amber-500 mb-2 tracking-tight">
            AI Job Searcher
          </h1>
        </header>

        {/* 
          Main content container using flex to position the sidebar and the grid.
          items-start ensures the sticky sidebar doesn't stretch to the full height.
        */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          {/* 
            Sticky Sidebar: stays visible at the top of the viewport during scrolling.
            The z-index ensures it stays above other content if necessary.
          */}
          <aside className="md:sticky md:top-8 w-full md:w-auto z-10">
            <form action={refreshAction}>
              <button 
                type="submit"
                className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg shadow-amber-500/20 whitespace-nowrap"
              >
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Update Vacancies
              </button>
            </form>
          </aside>

          {/* Main area for error messages or the vacancy grid */}
          <section className="flex-1">
            {error ? (
              <div className="bg-red-900/20 border border-red-500 text-red-200 p-4 rounded-lg">
                {error}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6">
                {vacancies.map((vacancy) => (
                  <article 
                    key={vacancy._id} 
                    className="group bg-slate-900 border border-gray-800 rounded-xl p-6 transition-all hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.1)] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        {/* Relevance score with Gold badge */}
                        <span className="bg-amber-500/10 text-amber-500 text-xs font-bold px-2 py-1 rounded border border-amber-500/20">
                          Score: {vacancy.score.toFixed(1)}
                        </span>
                        <span className="text-gray-600 text-[10px] uppercase tracking-widest font-mono">
                          ID: {vacancy._id?.slice(-6)}
                        </span>
                      </div>

                      {/* 
                        Using HTML5 details/summary for an interactive "Read More" feature.
                        This works in Server Components without requiring 'use client'.
                      */}
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

                    {/* External link with Gold button style */}
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

            {/* Empty state handler */}
            {!error && vacancies.length === 0 && (
              <div className="text-center py-20">
                <p className="text-gray-500 text-lg italic">No vacancies found at the moment...</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}