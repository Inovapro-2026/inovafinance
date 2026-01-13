
export type TransactionType = 'ganho' | 'gasto';

export interface Transaction {
  id?: number;
  userId: string;
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  date: string;
}

export interface Goal {
  id?: number;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
}

export interface UserProfile {
  userId: string;
  fullName?: string;
  email?: string;
  cpf?: string;
  birthDate?: string;
  biometricCredentialId?: string;
  initialBalance?: number; // Saldo inicial definido pelo usuário
}

export enum Page {
  DASHBOARD = 'dashboard',
  TRANSACTIONS = 'transactions',
  AI = 'ai',
  GOALS = 'goals',
  PROFILE = 'profile',
  CARD = 'card'
}
