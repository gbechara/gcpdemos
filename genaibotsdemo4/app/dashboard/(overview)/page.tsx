import CardWrapper from '@/app/ui/dashboard/cards';
import RevenueChart from '@/app/ui/dashboard/revenue-chart';
import GeminiPage from '@/app/ui/gemini/page'; 
import ReasoningEnginePage from '@/app/ui/reasoningengine/page';
import AgentBuilderPage from '@/app/ui/agentbuilder/page';
import LatestInvoices from '@/app/ui/dashboard/latest-invoices';
import { lusitana } from '@/app/ui/fonts';
import { Suspense } from 'react';
import {
  RevenueChartSkeleton,
  ReasoningEngineSkeleton,
  AgentBuilderSkeleton,
  ChatSkeleton,
  LatestInvoicesSkeleton,
  CardsSkeleton,
  GeminiSkeleton,
} from '@/app/ui/skeletons';

export default async function Page() {
  return (
    <main>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Dashboard
      </h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Suspense fallback={<CardsSkeleton />}>
          
        </Suspense>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-4 lg:grid-cols-8">
        <Suspense fallback={<RevenueChartSkeleton />}>
          
        </Suspense>
        <Suspense fallback={<ReasoningEngineSkeleton />}>
          <ReasoningEnginePage />
        </Suspense>
        <Suspense fallback={<AgentBuilderSkeleton />}>
          <AgentBuilderPage />
        </Suspense>

        <Suspense fallback={<GeminiSkeleton />}>
          <GeminiPage />
        </Suspense>

        <Suspense fallback={<LatestInvoicesSkeleton />}>
          
        </Suspense>
      </div>
    </main>
  );
}
