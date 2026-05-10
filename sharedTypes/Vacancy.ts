export interface Vacancy {
  _id?: string; 
  url: string;
  title: string;
  description: string;
  domain: string;
  score: number;
  viewed: boolean;
  favorite: boolean;
}