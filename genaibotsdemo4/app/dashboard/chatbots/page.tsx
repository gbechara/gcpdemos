import GeminiPage from '@/app/ui/gemini/page'; 
import ReasoningEnginePage from '@/app/ui/reasoningengine/page';
import AgentBuilderPage from '@/app/ui/agentbuilder/page';
import { lusitana } from '@/app/ui/fonts';
import { Suspense } from 'react';
import {
  ReasoningEngineSkeleton,
  AgentBuilderSkeleton,
  GeminiSkeleton,
} from '@/app/ui/skeletons';

export default async function Page() {
  return (
    <main>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Chat Bots Comparator
      </h1>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-4 lg:grid-cols-8">
        <Suspense fallback={<GeminiSkeleton />}>
          <GeminiPage />
        </Suspense>
        <Suspense fallback={<ReasoningEngineSkeleton />}>
          <ReasoningEnginePage />
        </Suspense>
        <Suspense fallback={<AgentBuilderSkeleton />}>
          <AgentBuilderPage />
        </Suspense>
      </div>
    </main>
  );
}
