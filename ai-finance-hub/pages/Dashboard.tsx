
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Transaction } from '../types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';

const COLORS = {
  ganho: '#4A90FF',
  Mercado: '#50C878',
  Serviços: '#FF8C42',
  'Lazer/Delivery': '#7A5CFA',
  Outros: '#6B7A8F'
};

const Dashboard: React.FC<{ userId: string }> = ({ userId }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [initialBalance, setInitialBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const txData = await db.transactions.where('userId').equals(userId).reverse().toArray();
      const profile = await db.profiles.get(userId);
      setTransactions(txData);
      setInitialBalance(profile?.initialBalance || 0);
      setIsLoading(false);
    };
    loadData();
  }, [userId]);

  const totalGanhos = transactions.filter(t => t.type === 'ganho').reduce((acc, t) => acc + t.amount, 0);
  const totalGastos = transactions.filter(t => t.type === 'gasto').reduce((acc, t) => acc + t.amount, 0);
  const currentBalance = initialBalance + totalGanhos - totalGastos;

  const pieData = transactions.filter(t => t.type === 'gasto').reduce((acc: any[], t) => {
    const cat = t.category || 'Outros';
    const existing = acc.find(item => item.name === cat);
    if (existing) existing.value += t.amount;
    else acc.push({ name: cat, value: t.amount });
    return acc;
  }, []);

  const evolutionData = (() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    let runningBalance = initialBalance + transactions.filter(t => new Date(t.date) < sevenDaysAgo).reduce((acc, t) => acc + (t.type === 'ganho' ? t.amount : -t.amount), 0);

    return days.map(dayStr => {
      const dayNet = transactions.filter(t => t.date.startsWith(dayStr)).reduce((acc, t) => acc + (t.type === 'ganho' ? t.amount : -t.amount), 0);
      runningBalance += dayNet;
      return {
        date: new Date(dayStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        saldo: runningBalance
      };
    });
  })();

  if (isLoading) return <div className="flex items-center justify-center h-full text-[#7A5CFA] font-bold animate-pulse">Sincronizando dados...</div>;

  return (
    <div className="flex flex-col gap-8 py-6 animate-fadeIn">
      {/* AI Insights Banner */}
      <div className="bg-gradient-to-r from-[#7A5CFA] to-[#4A90FF] p-6 rounded-[24px] shadow-lg text-white flex items-center justify-between relative overflow-hidden tech-card">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <i className="fas fa-robot text-sm"></i>
            <span className="text-[10px] font-black uppercase tracking-widest">IA Insight</span>
          </div>
          <h3 className="text-xl font-black italic">
            {totalGastos > totalGanhos 
              ? "Atenção: Fluxo de caixa negativo detectado. Vamos otimizar?" 
              : "Parabéns! Suas economias estão crescendo em ritmo constante."}
          </h3>
          <p className="text-xs opacity-80 mt-1 font-bold">Resumo tecnológico do seu patrimônio.</p>
        </div>
        <i className="fas fa-brain text-7xl opacity-10 absolute -right-4 -bottom-4"></i>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/70 backdrop-blur-md p-6 rounded-[24px] shadow-sm border border-white tech-card flex flex-col justify-between">
          <span className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Patrimônio Atual</span>
          <h2 className={`text-4xl font-black mt-2 tracking-tighter ${currentBalance >= 0 ? 'text-[#1A1A1A]' : 'text-red-500'}`}>
            R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h2>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-[#7A5CFA] font-black uppercase tracking-widest">
            <i className="fas fa-check-circle"></i>
            <span>Offline Sync Ativo</span>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-md p-6 rounded-[24px] shadow-sm border border-white tech-card flex flex-col justify-between">
          <span className="text-gray-400 font-black text-[10px] uppercase tracking-widest text-[#4A90FF]">Ganhos</span>
          <h2 className="text-4xl font-black mt-2 text-[#4A90FF] tracking-tighter">R$ {totalGanhos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
        </div>

        <div className="bg-white/70 backdrop-blur-md p-6 rounded-[24px] shadow-sm border border-white tech-card flex flex-col justify-between">
          <span className="text-gray-400 font-black text-[10px] uppercase tracking-widest text-[#FF8C42]">Gastos</span>
          <h2 className="text-4xl font-black mt-2 text-[#FF8C42] tracking-tighter">R$ {totalGastos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/60 backdrop-blur-lg p-8 rounded-[32px] shadow-sm border border-white tech-card min-h-[420px]">
          <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
            <i className="fas fa-chart-pie text-[#7A5CFA]"></i>
            Categorias Tech
          </h3>
          {pieData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={pieData} 
                    innerRadius={70} 
                    outerRadius={110} 
                    paddingAngle={8} 
                    dataKey="value"
                    animationBegin={200}
                    animationDuration={1200}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#6B7A8F'} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: '900' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 font-bold opacity-40">
              <i className="fas fa-database text-5xl mb-3"></i>
              <p>Nenhuma movimentação detectada.</p>
            </div>
          )}
        </div>

        <div className="bg-white/60 backdrop-blur-lg p-8 rounded-[32px] shadow-sm border border-white tech-card min-h-[420px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
              <i className="fas fa-wave-square text-[#7A5CFA]"></i>
              Evolução de Saldo
            </h3>
            <div className="text-[10px] font-black text-[#4A90FF] bg-[#4A90FF]/10 px-4 py-1 rounded-full uppercase tracking-widest">Semana</div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionData}>
                <defs>
                  <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7A5CFA" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#7A5CFA" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fontWeight: 900, fill: '#cbd5e1'}} 
                  dy={15} 
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="saldo" 
                  stroke="#7A5CFA" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorSaldo)" 
                  animationDuration={2000} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
