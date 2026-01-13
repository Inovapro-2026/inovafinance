
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Goal } from '../types';

const GoalsPage: React.FC<{ userId: string }> = ({ userId }) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');

  const loadGoals = async () => {
    const data = await db.goals.where('userId').equals(userId).toArray();
    setGoals(data);
  };

  useEffect(() => {
    loadGoals();
  }, [userId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(target);
    if (isNaN(amount)) return;

    await db.goals.add({
      userId,
      title,
      targetAmount: amount,
      currentAmount: 0,
      deadline
    });
    
    setIsAdding(false);
    setTitle('');
    setTarget('');
    setDeadline('');
    loadGoals();
  };

  return (
    <div className="py-4">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-black text-gray-800">Metas Financeiras</h2>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-[#7A5CFA] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
        >
          <i className="fas fa-plus"></i>
          Nova Meta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map(goal => {
          const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
          return (
            <div key={goal.id} className="bg-[#FF8C42]/5 border-2 border-[#7A5CFA]/20 p-8 rounded-[30px] shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-black text-gray-800">{goal.title}</h3>
                  <p className="text-gray-500 font-medium">Prazo: {new Date(goal.deadline).toLocaleDateString()}</p>
                </div>
                <div className="bg-white px-3 py-1 rounded-full text-xs font-black text-[#7A5CFA] border border-[#7A5CFA]/20">
                  {progress.toFixed(0)}%
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-gray-400">Progresso</span>
                  <span className="text-[#1A1A1A]">R$ {goal.currentAmount} / R$ {goal.targetAmount}</span>
                </div>
                <div className="w-full h-4 bg-white rounded-full overflow-hidden border border-gray-100">
                  <div 
                    className="h-full bg-gradient-to-r from-[#7A5CFA] to-[#4A90FF] rounded-full transition-all duration-1000 pulse-slow"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              {progress >= 100 && (
                <div className="flex items-center gap-2 text-green-500 font-bold text-sm">
                  <i className="fas fa-check-circle"></i>
                  <span>Meta Atingida!</span>
                </div>
              )}
            </div>
          );
        })}
        {goals.length === 0 && !isAdding && (
          <div className="col-span-full py-20 bg-white/40 border-2 border-dashed border-gray-300 rounded-[30px] flex flex-col items-center justify-center text-gray-400">
            <i className="fas fa-bullseye text-6xl mb-4 opacity-10"></i>
            <p className="text-lg">Você ainda não tem metas. Que tal economizar?</p>
          </div>
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-lg rounded-[30px] p-8 shadow-2xl">
            <h3 className="text-2xl font-black mb-6">Criar Nova Meta</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <input 
                type="text" 
                placeholder="Ex: Economizar R$500 no mês"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 font-medium outline-none"
                required
              />
              <input 
                type="number" 
                placeholder="Valor Alvo (R$)"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 font-medium outline-none"
                required
              />
              <input 
                type="date" 
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 font-medium outline-none"
                required
              />
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-4 border border-gray-200 rounded-2xl font-bold text-gray-500">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-[#7A5CFA] text-white rounded-2xl font-bold shadow-lg">Criar Meta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalsPage;
