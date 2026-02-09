import { ChatWindow } from "@/components/ChatWindow";
import { lusitana } from '@/app/ui/fonts';
import {Cat} from 'lucide-react'
import Script from 'next/script'

export default function Home() {
  const InfoCard = (
    <div className="w-full md:col-span-4">
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
      </h1>
    </div>
  );
  return (
    <div className="w-full md:col-span-4">
    <ChatWindow
      endpoint="/api/agentbuilder"
      //emoji="🦜"
      emoji=<Cat className="text-zinc-600"/>
      titleText="Agent Builder on Vertex AI"
      placeholder="I'm an Agent created by agent builder on Vertex AI!"
      emptyStateComponent={InfoCard}
    ></ChatWindow>
    <Script src="https://www.gstatic.com/dialogflow-console/fast/df-messenger/prod/v1/df-messenger.js"></Script>
    <df-messenger align="right" 
      location="us-central1"
      project-id="gab-devops-1"
      agent-id="f4b4d341-f2c5-41fc-8167-767195ace7c1"
      language-code="en"
      max-query-length="-1">
      <df-messenger-chat-bubble anchor="top-right"
      chat-title="Dialogflow Messenger">
      </df-messenger-chat-bubble>
    </df-messenger> 
      </div>

  );
}
