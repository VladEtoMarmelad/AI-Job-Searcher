'use client';

import { useState } from "react";
import { deleteAllVacanciesAction } from "@/actions/deleteAllVacanciesAction";

// Button with confirmation dialog for deleting all vacancies
export const DeleteAllButton = () => {
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleConfirmDelete = async () => {
    await deleteAllVacanciesAction();
    setShowConfirmation(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowConfirmation(!showConfirmation)}
        className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg shadow-red-600/20 whitespace-nowrap"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete All
      </button>

      {showConfirmation && (
        <div className="absolute top-full mt-2 w-full bg-slate-800 border border-red-500/50 rounded-lg shadow-lg z-50">
          <div className="p-4 space-y-3">
            <p className="text-sm text-red-200">Delete all vacancies? This cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-all duration-200"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
