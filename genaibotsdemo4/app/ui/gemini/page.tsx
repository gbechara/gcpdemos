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
      endpoint="api/chat"
      emoji="🦜"
      titleText="Gemini 1.5"
      placeholder="I'm an Gemini 1.5 ! Ask me anything!"
      emptyStateComponent={InfoCard}
    ></ChatWindow>
      </div>

  );
}
