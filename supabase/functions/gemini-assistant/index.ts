// Gemini Assistant Edge Function

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FinancialContext {
  balance: number;
  debitBalance: number;
  totalIncome: number;
  totalExpense: number;
  creditLimit: number;
  creditUsed: number;
  creditDueDay: number;
  daysUntilDue: number;
  salaryAmount: number;
  salaryDay: number;
  monthlyPaymentsTotal: number;
  projectedBalance: number;
  todayExpenses: number;
  todayIncome: number;
  scheduledPayments: Array<{
    name: string;
    amount: number;
    dueDay: number;
    category: string;
  }>;
  recentTransactions: Array<{
    amount: number;
    type: string;
    category: string;
    description: string;
    date: string;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context } = await req.json() as { message: string; context: FinancialContext };
    
    console.log('Received message:', message);
    console.log('Context:', context);

    // Detect if this is a transaction request
    const transactionKeywords = [
      'gastei', 'gasto', 'comprei', 'paguei', 'ganhei', 'recebi', 
      'receita', 'despesa', 'compra', 'pagamento', 'reais no', 'reais de',
      'gastando', 'comprando', 'pagando', 'registrar', 'registra'
    ];
    
    const normalizedMessage = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const isTransactionRequest = transactionKeywords.some(keyword => normalizedMessage.includes(keyword));
    
    console.log('Transaction request detected:', isTransactionRequest, 'Tool choice:', isTransactionRequest ? 'required' : 'auto');

    // Build the system prompt with accurate financial data
    const systemPrompt = `Você é a ISA, assistente financeira pessoal inteligente do app INOVA. Sua personalidade é acolhedora, direta e um pouco brincalhona (mas sempre respeitosa).

DADOS FINANCEIROS ATUAIS DO USUÁRIO (USE ESTES VALORES EXATOS):
- SALDO DISPONÍVEL EM DÉBITO/CONTA: R$ ${context.debitBalance.toFixed(2)}
- Limite de Crédito Total: R$ ${context.creditLimit.toFixed(2)}
- Crédito Usado: R$ ${context.creditUsed.toFixed(2)}
- Crédito Disponível: R$ ${(context.creditLimit - context.creditUsed).toFixed(2)}
- Vencimento do Cartão: Dia ${context.creditDueDay} (faltam ${context.daysUntilDue} dias)
- Salário: R$ ${context.salaryAmount.toFixed(2)} no dia ${context.salaryDay}
- Total de Contas Mensais: R$ ${context.monthlyPaymentsTotal.toFixed(2)}
- Saldo Projetado Após Contas: R$ ${context.projectedBalance.toFixed(2)}
- Gastos Hoje: R$ ${context.todayExpenses.toFixed(2)}
- Ganhos Hoje: R$ ${context.todayIncome.toFixed(2)}

CONTAS AGENDADAS:
${context.scheduledPayments.map(p => `- ${p.name}: R$ ${p.amount.toFixed(2)} (dia ${p.dueDay})`).join('\n') || 'Nenhuma conta agendada'}

ÚLTIMAS TRANSAÇÕES:
${context.recentTransactions.slice(0, 5).map(t => `- ${t.type === 'income' ? '✅ Receita' : '❌ Gasto'}: R$ ${t.amount.toFixed(2)} - ${t.description} (${t.date})`).join('\n') || 'Nenhuma transação recente'}

REGRAS IMPORTANTES:
1. SEMPRE use os valores EXATOS acima quando o usuário perguntar sobre saldo, dinheiro, quanto tem, etc.
2. O SALDO EM DÉBITO/CONTA é R$ ${context.debitBalance.toFixed(2)} - este é o dinheiro disponível para uso imediato
3. Seja clara: "saldo em conta" ou "no débito" = R$ ${context.debitBalance.toFixed(2)}
4. Seja clara: "limite disponível no crédito" = R$ ${(context.creditLimit - context.creditUsed).toFixed(2)}
5. Respostas curtas e diretas (máximo 2-3 frases)
6. Use emojis com moderação
7. Se o saldo estiver baixo, seja empática mas não dramática
8. Se o saldo estiver bom (acima de R$ 500), celebre com entusiasmo!

EXEMPLOS DE RESPOSTAS:
- Pergunta sobre saldo: "Você tem R$ ${context.debitBalance.toFixed(2)} disponível na conta! ${context.debitBalance > 500 ? '💪 Saldo saudável!' : 'Vamos cuidar bem dele!'}"
- Pergunta sobre crédito: "Seu limite disponível no cartão é R$ ${(context.creditLimit - context.creditUsed).toFixed(2)} de um total de R$ ${context.creditLimit.toFixed(2)}."`;

    // Define the transaction recording function
    const tools = [
      {
        type: 'function',
        function: {
          name: 'record_transaction',
          description: 'Registra uma transação financeira (gasto ou receita) para o usuário',
          parameters: {
            type: 'object',
            properties: {
              amount: {
                type: 'number',
                description: 'Valor da transação em reais'
              },
              type: {
                type: 'string',
                enum: ['income', 'expense'],
                description: 'Tipo: income para receita/ganho, expense para gasto/despesa'
              },
              category: {
                type: 'string',
                description: 'Categoria da transação (ex: Alimentação, Transporte, Salário, etc.)'
              },
              description: {
                type: 'string',
                description: 'Descrição breve da transação'
              }
            },
            required: ['amount', 'type', 'category', 'description']
          }
        }
      }
    ];

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        tools: tools,
        tool_choice: isTransactionRequest ? { type: 'function', function: { name: 'record_transaction' } } : 'auto',
        temperature: 0.7,
        max_tokens: 500
      })
    });

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data, null, 2));

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from AI');
    }

    const choice = data.choices[0];
    const aiMessage = choice.message;

    // Check if there's a function call
    if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
      const toolCall = aiMessage.tool_calls[0];
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      
      return new Response(JSON.stringify({
        message: aiMessage.content || 'Registrando transação...',
        functionCall: {
          name: functionName,
          args: args
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      message: aiMessage.content || 'Desculpe, não consegui processar sua solicitação.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(JSON.stringify({
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
