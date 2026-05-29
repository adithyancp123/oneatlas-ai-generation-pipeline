import { AppSpecViewer } from "@/components/app-spec";
import { ErrorBanner } from "@/components/errors";
import { StatusBanner } from "@/components/status";
import { ProviderPanel } from "@/components/providers";
import { IntegrationList } from "@/components/integrations";
import { CostPanel, JobSummary, PipelineStatus } from "@/components/pipeline";
import { GenerateButton, PromptInput } from "@/components/prompt";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui";
import { APP_NAME } from "@/config/constants";

export default function HomePage() {
  return (
    <main className="page-container">
      <header className="page-header">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="badge badge-muted">AI-native platform</span>
          <span className="hidden h-1 w-1 rounded-full bg-zinc-600 sm:inline" aria-hidden />
          <span className="text-xs text-zinc-500">Multi-stage pipeline</span>
        </div>
        <div className="space-y-2 pt-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-[1.75rem] sm:leading-tight">
            {APP_NAME}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-[15px] sm:leading-relaxed">
            Natural language in, validated machine-readable AppSpec out. Config-driven routing,
            repair engine, and live stage progress.
          </p>
        </div>
      </header>

      <div className="alerts-stack">
        <StatusBanner />
        <ErrorBanner />
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-col" aria-label="Pipeline controls">
          <Card>
            <CardHeader>
              <CardTitle>Prompt</CardTitle>
              <CardDescription>Describe the application you want to build</CardDescription>
            </CardHeader>
            <PromptInput />
            <CardFooter>
              <GenerateButton />
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pipeline</CardTitle>
              <CardDescription>Stage progress and timing via SSE</CardDescription>
            </CardHeader>
            <PipelineStatus />
          </Card>

          <JobSummary />
          <CostPanel />
          <ProviderPanel />
        </section>

        <section className="dashboard-col" aria-label="Output and integrations">
          <AppSpecViewer />
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Available connectors in the registry</CardDescription>
            </CardHeader>
            <IntegrationList />
          </Card>
        </section>
      </div>
    </main>
  );
}
