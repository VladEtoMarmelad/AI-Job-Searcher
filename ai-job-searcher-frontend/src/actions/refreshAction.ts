import { revalidatePath } from "next/cache";

/* Server Action that triggers a data re-fetch by invalidating the current path's cache */
export async function refreshAction() {
  'use server';
  revalidatePath('/');
}