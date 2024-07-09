//import { createVertex } from '@ai-sdk/google-vertex';

import { streamText } from "ai"
import { StreamingTextResponse } from "ai"
import { StreamData } from "ai"
import { Message} from "ai";

import {NextResponse} from 'next/server'

import {z} from 'zod'

import axios from 'axios';

const formatMessage = (message: Message) => {
  return `${message.role}: ${message.content}`;
};

const TEMPLATE = `All responses must be extremely verbose and in french.

Current conversation:
{chat_history}

User: {input}
AI:`;


/*
const vertex = createVertex({
    project: 'gab-devops-1', // optional
    location: 'us-central1', // optional
  });
  */



async function callReasoningEngine(prompt: String)  {
      /* 
      Call reasoning engine deployed with Python 
      Based on this doc : https://cloud.google.com/vertex-ai/generative-ai/docs/reasoning-engine/use#rest

      curl \
      -H "Authorization: Bearer $(gcloud auth print-access-token)" \
      -H "Content-Type: application/json" \
      https://us-central1-aiplatform.googleapis.com/v1beta1/projects/PROJECT_ID/locations/LOCATION/reasoningEngines/REASONING_ENGINE_ID:query -d '{
        "input": {
          "input": "What is the exchange rate from US dollars to Swedish currency?"
        }
      }'

      // projects/248688270572/locations/us-central1/reasoningEngines/248688270572
      */
    console.log("axios url :"+"https://us-central1-aiplatform.googleapis.com/v1beta1/projects/248688270572/locations/us-central1/reasoningEngines/1831170645363261440:query -d "+
    //JSON.stringify(
      '\''+JSON.stringify({"input":{"input": prompt}})+'\''
      //)
      +"\n");

    var subProcess = require('child_process');
    
    

    function getToken(){ 
      try {
        var stdout =  subProcess.execSync('gcloud auth application-default print-access-token');
        console.log('stdout: ' + stdout);
        return stdout.toString(); 
      } catch (err: any) {
        console.error('Error: ' + err.toString());  
      }
    }

    const token = 'Bearer '+ await getToken().replace(/\r?\n|\r/g, '');
    console.log('token: ' + token);

    let config = {
      headers: {
          Authorization: token,
          "Accept-Encoding": "application/json",
          "Content-Type": "application/json",
          responseType: 'stream',
      }
    }

    return await axios.post('https://us-central1-aiplatform.googleapis.com/v1beta1/projects/248688270572/locations/us-central1/reasoningEngines/1831170645363261440:query' 
    //,{"input":{"input": "How are you"}},
    ,JSON.stringify({"input":{"input": prompt}}),
          config,)
      // .then((response) => response.json())
        .then((res) => {
          console.log("axios return:"+res.data);
          return res;
        })
        .catch(function(error)  {
          console.log("axios error");
          if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.log(error.response.data);
            console.log(error.response.status);
            console.log(error.response.headers);
          } else if (error.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            console.log(error.request);
          } else {
            // Something happened in setting up the request that triggered an Error
            console.log('Error', error.message);
          }
          console.log(error.config);
          return error.response;
        });
      }

      export async function POST(request: Request) {
        const body = await request.json()
        /*const bodySchema = z.object({
          prompt: z.string(),
        })
      
        const {prompt} = bodySchema.parse(body)*/
      
        try {
          /*
          const { text } = await generateText({
              model: vertex('gemini-1.5-pro'),
              prompt: prompt,
            })
          console.log('prompt:'+prompt);
          console.log('response:'+text);
          */
      /*
          const response = await streamText({
              model: vertex('gemini-1.5-pro'),
              prompt: prompt,
            })*/

            const messages = body.messages ?? [];
            const formattedPreviousMessages = messages.slice(0, -1).map(formatMessage);
            const currentMessageContent = messages[messages.length - 1].content;
            //const prompt = PromptTemplate.fromTemplate(TEMPLATE);

            //console.log("prompt reasoningengine: "+JSON.stringify(prompt));
                
            console.log("ici");
            const responseReasoningEngine =  await callReasoningEngine(currentMessageContent); 
      
      
      ////
          
            const data = new StreamData();
      
            data.append('initialized call --');
            
            //data.append(responseReasoningEngine);
      
            console.log("responseReasoningEngine:"+JSON.stringify(responseReasoningEngine.data)+"\n");
            
            data.append('initialized call ---');
            data.append(JSON.stringify(responseReasoningEngine.data.output.output)+"\n");   
            data.append('initialized call ----');
      
            //return new NextResponse(JSON.stringify(responseReasoningEngine.output.output));
      
            console.log("request.method:"+request.destination);
      
      if (request.method != "submitRE"){
      
            const output = "0:"+JSON.stringify(responseReasoningEngine.data.output.output);
            const textEncoder = new TextEncoder();
            const fakeStream = new ReadableStream({
              async start(controller) {
                for (const character of output) {
                  controller.enqueue(textEncoder.encode(character));
                  //await new Promise((resolve) => setTimeout(resolve, 20));
                }
                controller.close();
              },
            });
      
            data.close();
            //return new StreamingTextResponse(fakeStream);
            return new StreamingTextResponse(
              fakeStream,
              {},
              data,
            );
            }
      
        } catch (error) {
          console.log('error', error)
          return new NextResponse(JSON.stringify({error}), {
            status: 500,
            headers: {'content-type': 'application/json'},
          })
        }
      }