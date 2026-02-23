import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { MongoClient, Collection, Db, ObjectId, WithId } from 'mongodb';
import { Vacancy } from "@sharedTypes/Vacancy"

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DbService.name);

  private readonly uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@main-vacancy-cluster.krct5sv.mongodb.net/`
  private client: MongoClient;
  private db: Db;

  constructor() {
    this.client = new MongoClient(this.uri);
  }

  async onModuleInit() {
    await this.client.connect();
    this.db = this.client.db(process.env.DB_NAME); 
    this.logger.log("Connected to MongoDB Atlas")
  }

  async onModuleDestroy() {
    await this.client.close();
  }

  private get collection(): Collection<Vacancy> {
    return this.db.collection<Vacancy>('vacancies');
  }

  // Check if a vacancy with the given URL already exists in the database
  async isVacancyExists(url: string): Promise<boolean> {
    const count = await this.collection.countDocuments({ url }, { limit: 1 });
    return count > 0;
  }

  async saveVacancy(vacancy: Vacancy) {
    return await this.collection.insertOne(vacancy);
  }

  async getVacancies() {
    const collection = this.db.collection<Vacancy>('vacancies');
    return await collection.find({}).toArray();
  }

  async deleteVacancy(id: string) {
    const collection = this.db.collection<WithId<Vacancy>>('vacancies');
    await collection.deleteOne({ _id: new ObjectId(id) as any });
  }

  async updateVacancyStatus(id: string, viewed: boolean) {
    const collection = this.db.collection<WithId<Vacancy>>('vacancies');
    const isViewed = String(viewed) === 'true';

    await collection.updateOne(
      { _id: new ObjectId(id) as any },
      { $set: { viewed: isViewed } }
    )
  }
}