import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

@Injectable()
export class SummaryChain {
  private readonly model: ChatOpenAI;

  constructor(private readonly configService: ConfigService) {
    this.model = new ChatOpenAI({
      openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
      modelName: this.configService.get<string>('OPENAI_CHAT_MODEL', 'gpt-4o-mini'),
      temperature: 0,
    });
  }

  /** Summarize customer feedback about a specific topic. */
  async summarize(topic: string, feedbackTexts: string[]): Promise<string> {
    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        'You are an expert customer feedback analyst. Provide concise, actionable summaries.',
      ],
      [
        'user',
        `Summarize the following customer feedback about "{topic}".
Highlight key pain points and positive mentions.

Feedback:
{feedback}`,
      ],
    ]);

    const chain = prompt.pipe(this.model).pipe(new StringOutputParser());
    return chain.invoke({ topic, feedback: feedbackTexts.join('\n---\n') });
  }
}
