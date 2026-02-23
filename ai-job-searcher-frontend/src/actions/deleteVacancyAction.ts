import { revalidatePath } from "next/cache";
import axios from "axios";

/**
 * Server Action to handle the deletion of a vacancy.
 * Communicates with the external API and refreshes the cache.
 */
export async function deleteVacancyAction(id: string) {
  'use server';
  try {
    // Sends a request to the delete endpoint with the specific vacancy ID
    await axios.delete(`http://localhost:3030/db/vacancy/delete`, { params: { id } });
    // Invalidate the cache to remove the deleted item from the UI immediately
    revalidatePath('/');
  } catch (err: unknown) {
    console.error("Error deleting vacancy:", err);
  }
}