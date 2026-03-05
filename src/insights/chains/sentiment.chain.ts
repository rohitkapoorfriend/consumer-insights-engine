import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

export interface SentimentResult {
  sentiment: string;
  score: number;
}

@Injectable()
export class SentimentChain {
  private readonly logger = new Logger(SentimentChain.name);
  private readonly model: ChatOpenAI;

  constructor(private readonly configService: ConfigService) {
    this.model = new ChatOpenAI({
      openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
      modelName: this.configService.get<string>('OPENAI_CHAT_MODEL', 'gpt-4o-mini'),
      temperature: 0,
    });
  }

  async analyze(text: string): Promise<SentimentResult> {
    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        'You are a sentiment analysis expert. Always respond with valid JSON only.',
      ],
      [
        'user',
        `Analyze the sentiment of the following text.
Return ONLY a valid JSON object with "sentiment" (one of: positive, negative, neutral) and "score" (0 to 1).

Text:
{text}`,
      ],
    ]);

    const chain = prompt.pipe(this.model).pipe(new StringOutputParser());
    const result = await chain.invoke({ text });

    try {
      return JSON.parse(result) as SentimentResult;
    } catch {
      this.logger.warn('Failed to parse sentiment output, defaulting to neutral');
      return { sentiment: 'neutral', score: 0.5 };
    }
  }
}
