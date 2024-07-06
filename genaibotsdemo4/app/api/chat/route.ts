import { createVertex } from '@ai-sdk/google-vertex';

import { streamText } from "ai"
import { StreamingTextResponse } from "ai"
import { StreamData } from "ai"

import {NextResponse} from 'next/server'

import { Message} from "ai";

import {z} from 'zod'

import { PromptTemplate } from "@langchain/core/prompts";
const formatMessage = (message: Message) => {
  return `${message.role}: ${message.content}`;
};

const TEMPLATE = `All responses must be extremely verbose and in french.

Current conversation:
{chat_history}

User: {input}
AI:`;


const vertex = createVertex({
    project: 'gab-devops-1', // optional
    location: 'us-central1', // optional
  });
  
export async function POST(request: Request) {
  const body = await request.json()
  /*const bodySchema = z.object({
    prompt: z.string(),
  })
  const {prompt} = bodySchema.parse(body)
  */


  const messages = body.messages ?? [];
  const formattedPreviousMessages = messages.slice(0, -1).map(formatMessage);
  const currentMessageContent = messages[messages.length - 1].content;
  const prompt = PromptTemplate.fromTemplate(TEMPLATE);

  console.log("prompt for gemini 1.5 :"+JSON.stringify(prompt));

  
  try {
    /*
    const { text } = await generateText({
        model: vertex('gemini-1.5-pro'),
        prompt: prompt,
      })
    console.log('prompt:'+prompt);
    console.log('response:'+text);
    */

    const response = await streamText({
        model: vertex('gemini-1.5-pro'),
        prompt: currentMessageContent,
      })

    
      const data = new StreamData();

      data.append('initialized call --');
      
      return new StreamingTextResponse(
        response.toAIStream({
          onFinal() {
            data.append('call completed');
            data.close();
          },
        }),
        {},
        data,
      );

      

  } catch (error) {
    console.log('error', error)
    return new NextResponse(JSON.stringify({error}), {
      status: 500,
      headers: {'content-type': 'application/json'},
    })
  }
}