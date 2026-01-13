
import Dexie, { type Table } from 'dexie';
import { Transaction, Goal, UserProfile } from './types';

// Fix: Using a default import for Dexie to ensure that the class and its inherited methods (like version) are correctly resolved in the subclass.
export class InovaFinanceDB extends Dexie {
  transactions!: Table<Transaction>;
  goals!: Table<Goal>;
  profiles!: Table<UserProfile>;

  constructor() {
    super('InovaFinanceDB');
    
    // The version() method is a standard Dexie instance method used to define the database schema and versioning.
    this.version(1).stores({
      transactions: '++id, userId, type, category, date',
      goals: '++id, userId, deadline',
      profiles: 'userId'
    });
  }
}

export const db = new InovaFinanceDB();
