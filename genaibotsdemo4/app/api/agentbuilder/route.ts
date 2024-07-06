import { streamText } from "ai"
import { StreamingTextResponse } from "ai"
import { StreamData } from "ai"
import { Message} from "ai";

import {NextResponse} from 'next/server'

import {z} from 'zod'

import axios from 'axios';

import { PromptTemplate } from "@langchain/core/prompts";
const formatMessage = (message: Message) => {
  return `${message.role}: ${message.content}`;
};

const TEMPLATE = `All responses must be extremely verbose and in french.

Current conversation:
{chat_history}

User: {input}
AI:`;
  

async function callAgentBuilder(prompt: String)  {
      /* 
      API to request an agent : https://cloud.google.com/dialogflow/vertex/docs/quick/api
      
      curl -X POST \
          -H "Authorization: Bearer $(gcloud auth print-access-token)" \
          -H "x-goog-user-project: gab-devops-1" \
          -H "Content-Type: application/json; charset=utf-8" \
          -d @request.json \
          "https://us-central1-dialogflow.googleapis.com/v3/projects/gab-devops-1/locations/us-central1/agents/50ae691b-f62c-47d6-9f34-ea971cb29e4e/sessions/gab-devops-1-test-session-1234:detectIntent"

          set quota project : https://cloud.google.com/docs/authentication/troubleshoot-adc#user-creds-client-based
          gcloud auth application-default set-quota-project gab-devops-1
          "x-goog-user-project: gab-devops-1"

      */

    // https://dialogflow.cloud.google.com/cx/projects/gab-devops-1/locations/us-central1/agents/50ae691b-f62c-47d6-9f34-ea971cb29e4e/playbooks/c93adc28-d189-4c59-9644-192b799fc5fa/basics
    // add play book id in the URL
    
    console.log("axios url :"+"https://us-central1-dialogflow.googleapis.com/v3/projects/gab-devops-1/locations/us-central1/agents/50ae691b-f62c-47d6-9f34-ea971cb29e4e/sessions/gab-devops-1-test-session-123456:detectIntent "+
      '\''+
      JSON.stringify(
        {
          "queryInput": {
            "text": {
              "text": prompt
            },
            "languageCode": "en"
          },
          "queryParams": {
            "timeZone": "America/Los_Angeles"
          }
        }
      )+'\''
      +"\n");

    var subProcess = require('child_process');
    
    function getToken(){ 
      try {
        var stdout =  subProcess.execSync('gcloud auth print-access-token');
        console.log('stdout: ' + stdout);
        return stdout.toString(); 
      } catch (err) {
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
          "x-goog-user-project": "gab-devops-1",
          responseType: 'stream',
      }
    }

    return await axios.post('https://us-central1-dialogflow.googleapis.com/v3/projects/gab-devops-1/locations/us-central1/agents/50ae691b-f62c-47d6-9f34-ea971cb29e4e/sessions/gab-devops-1-test-session-123456:detectIntent ' 
          ,JSON.stringify(
            {
              "queryInput": {
                "text": {
                  "text": prompt
                },
                "languageCode": "en"
              },
              "queryParams": {
                "timeZone": "America/Los_Angeles"
              }
            }
          ),
          config,)
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

          const messages = body.messages ?? [];
            const formattedPreviousMessages = messages.slice(0, -1).map(formatMessage);
            const currentMessageContent = messages[messages.length - 1].content;
            
            console.log("ici");
            const responseAgentBuilder =  await callAgentBuilder(currentMessageContent); 
      
      
      ////
          
            const data = new StreamData();
      
            data.append('initialized call --');
            
            //data.append(responseReasoningEngine);
      
            console.log("responseAgentBuilder:"+JSON.stringify(responseAgentBuilder.data)+"\n");
            
            data.append('initialized call ---');
            data.append(JSON.stringify(responseAgentBuilder.data.queryResult.responseMessages[0].text.text[0])+"\n");   
            data.append('initialized call ----');
            
            console.log("request.method:"+request.destination);
      
      
            const output = "0:"+JSON.stringify(responseAgentBuilder.data.queryResult.responseMessages[0].text.text[0]);
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
        } catch (error) {
          console.log('error', error)
          return new NextResponse(JSON.stringify({error}), {
            status: 500,
            headers: {'content-type': 'application/json'},
          })
        }
      }