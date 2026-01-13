
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Transaction, TransactionType } from '../types';

const CATEGORIES = ['Ganhos', 'Mercado', 'Serviços', 'Lazer/Delivery', 'Outros'];

const TransactionsPage: React.FC<{ userId: string }> = ({ userId }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('gasto');
  const [category, setCategory] = useState('Outros');
  const [description, setDescription] = useState('');

  const loadTransactions = async () => {
    const data = await db.transactions
      .where('userId')
      .equals(userId)
      .reverse()
      .toArray();
    setTransactions(data);
  };

  useEffect(() => {
    loadTransactions();
  }, [userId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount.replace(',', '.'));
    if (isNaN(val)) return;

    await db.transactions.add({
      userId,
      amount: val,
      type,
      category,
      description,
      date: new Date().toISOString()
    });

    setIsModalOpen(false);
    setAmount('');
    setDescription('');
    loadTransactions();
  };

  const handleDelete = async (id: number) => {
    if (confirm('Deseja realmente excluir esta transação?')) {
      await db.transactions.delete(id);
      loadTransactions();
    }
  };

  return (
    <div className="py-4">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-black text-gray-800">Movimentações</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#4A90FF] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all"
        >
          <i className="fas fa-plus"></i>
          Nova Transação
        </button>
      </div>

      <div className="space-y-4">
        {transactions.map(t => (
          <div key={t.id} className="bg-white/60 p-6 rounded-[20px] shadow-sm border border-white/20 flex items-center justify-between group hover:shadow-md transition-all">
            <div className="flex items-center gap-4">
               <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${t.type === 'ganho' ? 'bg-[#4A90FF]' : 'bg-[#FF8C42]'}`}>
                  <i className={`fas ${t.type === 'ganho' ? 'fa-arrow-up' : 'fa-arrow-down'}`}></i>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{t.description}</h4>
                  <p className="text-sm text-gray-500 font-medium">{t.category} • {new Date(t.date).toLocaleDateString()}</p>
                </div>
            </div>
            <div className="flex items-center gap-6">
              <span className={`text-xl font-black ${t.type === 'ganho' ? 'text-[#4A90FF]' : 'text-[#FF8C42]'}`}>
                {t.type === 'ganho' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <button onClick={() => handleDelete(t.id!)} className="text-gray-300 hover:text-red-500 transition-colors">
                <i className="fas fa-trash-alt"></i>
              </button>
            </div>
          </div>
        ))}
        {transactions.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <i className="fas fa-receipt text-6xl mb-4 opacity-10"></i>
            <p className="text-lg">Nenhuma movimentação encontrada.</p>
          </div>
        )}
      </div>

      {/* Quick Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-lg rounded-[30px] p-8 shadow-2xl border border-white/20">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black">Adicionar Transação</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="flex items-center justify-center mb-6">
                <div className="bg-gray-100 p-1 rounded-2xl flex w-full">
                  <button 
                    type="button" 
                    onClick={() => setType('ganho')}
                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${type === 'ganho' ? 'bg-[#4A90FF] text-white shadow-md' : 'text-gray-500'}`}
                  >
                    Ganho
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setType('gasto')}
                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${type === 'gasto' ? 'bg-[#FF8C42] text-white shadow-md' : 'text-gray-500'}`}
                  >
                    Gasto
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">Valor</label>
                <div className="relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                   <input 
                    type="text" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 font-black text-2xl text-[#1A1A1A] outline-none focus:ring-2 focus:ring-[#7A5CFA]/20"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">Descrição</label>
                <input 
                  type="text" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Almoço no shopping"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 font-medium text-gray-800 outline-none focus:ring-2 focus:ring-[#7A5CFA]/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">Categoria</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${category === cat ? 'bg-[#7A5CFA] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      {cat}
                    </button>
                  ))}
                  <button type="button" className="px-4 py-2 rounded-full text-sm font-bold border border-[#7A5CFA] text-[#7A5CFA] hover:bg-[#7A5CFA]/5 transition-all">
                    + Nova
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full bg-[#4A90FF] text-white py-4 rounded-2xl font-black text-lg hover:bg-blue-600 transition-all shadow-xl bounce-3"
              >
                Salvar Transação
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;
