import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { MongoClient, Collection, Db, ObjectId, OptionalId, Filter } from 'mongodb';
import { Vacancy } from '@sharedTypes/Vacancy';
import { VacancyDocument } from "src/types/VacancyDocument"
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DbService.name);

  private uri!: string;
  private client!: MongoClient;
  private db!: Db;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const dbUser = this.configService.get<string>('DB_USER');
    const dbPassword = this.configService.get<string>('DB_PASSWORD');
    const dbName = this.configService.get<string>('DB_NAME');

    this.uri = `mongodb+srv://${dbUser}:${dbPassword}@main-vacancy-cluster.krct5sv.mongodb.net/`

    this.client = new MongoClient(this.uri);
    await this.client.connect();
    
    this.db = this.client.db(dbName); 

    this.logger.log("Connected to MongoDB Atlas")
  }

  async onModuleDestroy() {
    await this.client.close();
  }

  /**
   * The collection is typed with VacancyDocument to ensure _id is treated as an ObjectId.
   */
  private get collection(): Collection<VacancyDocument> {
    return this.db.collection<VacancyDocument>('vacancies');
  }

  async isVacancyExists(url: string): Promise<boolean> {
    const count = await this.collection.countDocuments({ url } as Filter<VacancyDocument>, { limit: 1 });
    return count > 0;
  }

  async saveVacancy(vacancy: Vacancy) {
    /**
     * We cast the vacancy to unknown then to VacancyDocument to bypass the string/ObjectId mismatch.
     * insertOne accepts OptionalId, so the absence of _id is handled automatically.
     */
    return await this.collection.insertOne(vacancy as unknown as OptionalId<VacancyDocument>);
  }

  async getVacancies(): Promise<Vacancy[]> {
    /**
     * When returning data, we cast the array back to the shared Vacancy interface.
     * In JavaScript, ObjectId stringifies to its hex representation when sent over HTTP.
     */
    const documents = await this.collection.find({}).toArray();
    return documents as unknown as Vacancy[];
  }

  async deleteVacancy(id: string) {
    /**
     * Now that the collection is typed with VacancyDocument, 
     * it accepts ObjectId for the _id field without needing 'any'.
     */
    await this.collection.deleteOne({ _id: new ObjectId(id) });
  }

  async updateVacancyStatus(id: string, viewed: boolean) {
    const isViewed = String(viewed) === 'true';

    await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { viewed: isViewed } }
    )
  }

  async deleteAllVacancies() {
    await this.collection.deleteMany({});
  }
}