import { ChatWindow } from "@/components/ChatWindow";
import { lusitana } from '@/app/ui/fonts';


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
      emoji="🦜"
      titleText="Agent Builder on Vertex AI"
      placeholder="I'm a lox code Agent created by agent builder on Vertex AI!"
      emptyStateComponent={InfoCard}
    ></ChatWindow>
      </div>

  );
}
