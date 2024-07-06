import { createVertex } from '@ai-sdk/google-vertex';

import { streamText } from "ai"
import { StreamingTextResponse } from "ai"
import { StreamData } from "ai"

import {NextResponse} from 'next/server'

import {z} from 'zod'

const vertex = createVertex({
    project: 'gab-devops-1', // optional
    location: 'us-central1', // optional
  });
  
export async function POST(request: Request) {
  const body = await request.json()
  const bodySchema = z.object({
    prompt: z.string(),
  })

  const {prompt} = bodySchema.parse(body)

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
        prompt: prompt,
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