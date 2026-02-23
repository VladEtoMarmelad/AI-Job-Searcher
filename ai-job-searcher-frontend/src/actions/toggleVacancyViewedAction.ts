import { revalidatePath } from "next/cache";
import axios from "axios";

/**
 * Server Action to toggle the 'viewed' status of a vacancy.
 * Sends the inverse of the current status to the API.
 */
export async function toggleVacancyViewedAction(id: string, currentStatus: boolean) {
  'use server';

  try {
    // Sends a request to update the status using the opposite of the current boolean value
    await axios.patch(`http://localhost:3030/db/vacancy/updateStatus`, null, { 
      params: { 
        id, 
        viewed: !currentStatus 
      } 
    });
    // Refresh the page data to show the updated status
    revalidatePath('/');
  } catch (err: unknown) {
    console.error("Error updating vacancy status:", err);
  }
}