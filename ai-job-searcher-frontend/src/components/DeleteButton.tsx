'use client';

import { useState } from 'react';

interface DeleteButtonProps {
  id: string;
  onDelete: (id: string) => Promise<void>
}

// Client Component that manages the confirmation state before calling the delete Server Action.
export const DeleteButton = ({ id, onDelete }: DeleteButtonProps) => {
  const [isConfirming, setIsConfirming] = useState(false);

  // When user clicks 'Delete', we show the confirmation screen
  if (isConfirming) {
    return (
      <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
        <span className="text-[10px] text-red-500 font-bold uppercase">Are you sure?</span>
        <button 
          onClick={() => onDelete(id)}
          className="text-[10px] bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded font-bold"
        >
          Yes
        </button>
        <button 
          onClick={() => setIsConfirming(false)}
          className="text-[10px] bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded font-bold"
        >
          No
        </button>
      </div>
    );
  }

  // Initial state: trash icon button
  return (
    <button 
      onClick={() => setIsConfirming(true)}
      className="text-gray-500 hover:text-red-500 transition-colors"
      title="Delete Vacancy"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  );
}