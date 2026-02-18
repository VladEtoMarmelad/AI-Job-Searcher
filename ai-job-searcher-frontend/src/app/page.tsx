import axios from 'axios';

// Interface for the Vacancy object
export interface Vacancy {
  _id: string; 
  url: string;
  description: string;
  score: number;
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
      <div className="max-w-6xl mx-auto">
        {/* Header section with Gold accent */}
        <header className="mb-12 border-b border-amber-500/30 pb-6">
          <h1 className="text-4xl font-bold text-amber-500 mb-2 tracking-tight">
            AI Job Searcher
          </h1>
        </header>

        {error ? (
          <div className="bg-red-900/20 border border-red-500 text-red-200 p-4 rounded-lg">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      ID: {vacancy._id.slice(-6)}
                    </span>
                  </div>

                  {/* Description with Grey color */}
                  <p className="text-gray-300 text-sm leading-relaxed mb-6 line-clamp-4 group-hover:text-white transition-colors">
                    {vacancy.description}
                  </p>
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
      </div>
    </main>
  );
}