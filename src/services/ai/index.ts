// Vesta AI Advisor Service
// Uses Claude (Anthropic) for portfolio analysis and recommendations

const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

// Use Claude by default, fallback to OpenAI
const USE_CLAUDE = !!ANTHROPIC_API_KEY;

interface PortfolioContext {
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  holdings: Array<{
    name: string;
    symbol?: string;
    type: string;
    value: number;
    allocation: number;
    gainLoss: number;
    gainLossPercent: number;
  }>;
  allocationByType: Record<string, number>;
  allocationBySector?: Record<string, number>;
  allocationByCountry?: Record<string, number>;
}

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are Vesta AI, a friendly and knowledgeable portfolio advisor built into the Vesta wealth tracking app. Your role is to:

1. Analyze the user's portfolio data and provide insights
2. Answer questions about diversification, risk, and allocation
3. Suggest improvements based on their current holdings
4. Explain financial concepts in simple terms

IMPORTANT GUIDELINES:
- Be conversational but professional
- Always clarify you're providing educational information, not financial advice
- Use the portfolio data provided to give personalized insights
- Keep responses concise (2-4 paragraphs max)
- Use bullet points for lists and recommendations
- Express percentages and values clearly
- If asked about specific stocks/crypto to buy, remind users you can't make specific investment recommendations

PORTFOLIO CONTEXT WILL BE PROVIDED WITH EACH MESSAGE.`;

export async function sendAIMessage(
  userMessage: string,
  portfolioContext: PortfolioContext,
  conversationHistory: AIMessage[] = []
): Promise<string> {
  const contextString = buildContextString(portfolioContext);

  if (USE_CLAUDE) {
    return sendClaudeMessage(userMessage, contextString, conversationHistory);
  } else if (OPENAI_API_KEY) {
    return sendOpenAIMessage(userMessage, contextString, conversationHistory);
  } else {
    return getMockResponse(userMessage, portfolioContext);
  }
}

function buildContextString(ctx: PortfolioContext): string {
  const topHoldings = ctx.holdings
    .sort((a, b) => b.allocation - a.allocation)
    .slice(0, 10)
    .map(h => `- ${h.symbol || h.name} (${h.type}): $${h.value.toLocaleString()} (${h.allocation.toFixed(1)}% of portfolio, ${h.gainLossPercent >= 0 ? '+' : ''}${h.gainLossPercent.toFixed(1)}%)`)
    .join('\n');

  const allocationBreakdown = Object.entries(ctx.allocationByType)
    .filter(([_, pct]) => pct > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([type, pct]) => `- ${type}: ${pct.toFixed(1)}%`)
    .join('\n');

  return `
CURRENT PORTFOLIO STATUS:
- Total Value: $${ctx.totalValue.toLocaleString()}
- Total Gain/Loss: $${ctx.totalGainLoss.toLocaleString()} (${ctx.totalGainLossPercent >= 0 ? '+' : ''}${ctx.totalGainLossPercent.toFixed(1)}%)
- Number of Holdings: ${ctx.holdings.length}

TOP HOLDINGS:
${topHoldings}

ALLOCATION BY ASSET TYPE:
${allocationBreakdown}
`;
}

async function sendClaudeMessage(
  userMessage: string,
  contextString: string,
  history: AIMessage[]
): Promise<string> {
  try {
    const messages = [
      ...history.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: `${contextString}\n\nUSER QUESTION: ${userMessage}`,
      },
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Claude API error:', error);
      return getMockResponse(userMessage, null);
    }

    const data = await response.json();
    return data.content[0]?.text || 'I apologize, but I was unable to generate a response.';
  } catch (error) {
    console.error('Error calling Claude:', error);
    return getMockResponse(userMessage, null);
  }
}

async function sendOpenAIMessage(
  userMessage: string,
  contextString: string,
  history: AIMessage[]
): Promise<string> {
  try {
    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...history.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: `${contextString}\n\nUSER QUESTION: ${userMessage}`,
      },
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return getMockResponse(userMessage, null);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.';
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return getMockResponse(userMessage, null);
  }
}

// Fallback mock responses when no API key is configured
function getMockResponse(userMessage: string, context: PortfolioContext | null): string {
  const message = userMessage.toLowerCase();

  if (message.includes('diversif')) {
    return `**Portfolio Diversification Analysis**

Based on your portfolio, here are my observations:

${context ? `
- You have ${context.holdings.length} different holdings
- Your largest position represents ${context.holdings[0]?.allocation?.toFixed(1) || 0}% of your portfolio
` : ''}

**Recommendations:**
- Consider keeping any single position below 20-25% of total portfolio
- Diversify across at least 3-5 different asset classes
- Include both growth and income-producing assets

*This is educational information, not financial advice. Please consult a financial advisor for personalized guidance.*`;
  }

  if (message.includes('risk')) {
    return `**Risk Assessment**

Your portfolio risk level depends on several factors:

**Key Risk Factors:**
- Asset concentration in top holdings
- Exposure to volatile asset classes (like crypto)
- Correlation between your holdings

**Risk Mitigation Tips:**
- Add fixed-income assets like bonds for stability
- Consider geographic diversification
- Maintain 3-6 months expenses in cash/equivalents

*This is educational information, not financial advice.*`;
  }

  if (message.includes('rebalance') || message.includes('rebalancing')) {
    return `**Rebalancing Guidance**

Rebalancing helps maintain your target asset allocation over time.

**When to Rebalance:**
- When allocations drift 5%+ from targets
- At regular intervals (quarterly or semi-annually)
- After major life changes or market events

**How to Rebalance:**
1. Review your current vs. target allocation
2. Sell overweight positions
3. Buy underweight positions
4. Consider tax implications

*Remember to consider transaction costs and tax consequences before rebalancing.*`;
  }

  return `Thanks for your question! I'm Vesta AI, your portfolio advisor.

${context ? `
Looking at your portfolio of $${context.totalValue.toLocaleString()} across ${context.holdings.length} holdings, I can help you with:

- **Diversification analysis** - How well-spread are your investments?
- **Risk assessment** - What's your portfolio's risk profile?
- **Rebalancing suggestions** - Should you adjust your allocations?

` : ''}What would you like to know more about?

*This is educational information, not financial advice.*`;
}

export function isAIConfigured(): boolean {
  return !!(ANTHROPIC_API_KEY || OPENAI_API_KEY);
}

export function getAIProvider(): 'claude' | 'openai' | 'mock' {
  if (ANTHROPIC_API_KEY) return 'claude';
  if (OPENAI_API_KEY) return 'openai';
  return 'mock';
}
