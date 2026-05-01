import axios from "axios";

// Client-side function to delete all vacancies from the database
export async function deleteAllVacanciesAction() {
  try {
    await axios.delete(`http://localhost:3030/db/vacancies`);
    window.location.reload();
  } catch (err: unknown) {
    console.error("Error deleting all vacancies:", err);
  }
}
