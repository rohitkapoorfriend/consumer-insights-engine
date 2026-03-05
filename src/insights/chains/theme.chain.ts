import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

export interface Theme {
  name: string;
  description: string;
}

@Injectable()
export class ThemeChain {
  private readonly logger = new Logger(ThemeChain.name);
  private readonly model: ChatOpenAI;

  constructor(private readonly configService: ConfigService) {
    this.model = new ChatOpenAI({
      openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
      modelName: this.configService.get<string>('OPENAI_CHAT_MODEL', 'gpt-4o-mini'),
      temperature: 0,
    });
  }

  async extract(feedbackTexts: string[]): Promise<Theme[]> {
    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        'You are an expert customer feedback analyst. Analyze the provided feedback and identify recurring themes.',
      ],
      [
        'user',
        `Given the following customer feedback entries, identify the top 5 recurring themes.
Return ONLY a valid JSON array with objects containing "name" and "description" fields.

Feedback entries:
{feedback}`,
      ],
    ]);

    const chain = prompt.pipe(this.model).pipe(new StringOutputParser());
    const result = await chain.invoke({ feedback: feedbackTexts.join('\n---\n') });

    try {
      return JSON.parse(result) as Theme[];
    } catch {
      this.logger.warn('Failed to parse theme chain output, returning raw');
      return [{ name: 'Parse Error', description: result }];
    }
  }
}
