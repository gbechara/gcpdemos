import { ChatWindow } from "@/components/ChatWindow";
import { lusitana } from '@/app/ui/fonts';
import { Link } from 'lucide-react';


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
      endpoint="/api/reasoningengine"
      //emoji="🦜"
      emoji=<Link className="text-zinc-600"/>
      titleText="Reasoning Engine on Vertex AI"
      placeholder="I'm a LangChain Agent deployed Reasoning Engine on Vertex AI!"
      emptyStateComponent={InfoCard}
    ></ChatWindow>
      </div>

  );
}
