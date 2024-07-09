import { ChatWindow } from "@/components/ChatWindow";
import { lusitana } from '@/app/ui/fonts';
import {Cat} from 'lucide-react'

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
      endpoint="api/agentbuilder"
      //emoji="🦜"
      emoji=<Cat className="text-zinc-600"/>
      titleText="Agent Builder on Vertex AI"
      placeholder="I'm an Agent created by agent builder on Vertex AI!"
      emptyStateComponent={InfoCard}
    ></ChatWindow>
      </div>

  );
}
