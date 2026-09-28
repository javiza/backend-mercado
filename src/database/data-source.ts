import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './typeorm.config';

// Solo para el CLI de TypeORM (npm run migration:*). La app NO usa este archivo.
dotenv.config();
export default new DataSource(buildTypeOrmOptions(process.env, { globEntities: true }));
