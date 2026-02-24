import { ObjectId } from 'mongodb';
import { Vacancy } from "@sharedTypes/Vacancy";

// Internal type that maps the shared Vacancy interface to MongoDB's requirements.
// Creating a type for the DB: we take everything from Vacancy, but replace string _id with MongoDB's ObjectId
export type VacancyDocument = Omit<Vacancy, '_id'> & { _id?: ObjectId };