import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { MongoClient, Collection, Db } from 'mongodb';

export interface Vacancy {
  url: string;
  description: string;
  score: number;
}

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

  async saveVacancy(vacancy: Vacancy) {
    return await this.collection.insertOne(vacancy);
  }

  async getAllVacancies() {
    return await this.collection.find().toArray();
  }
}