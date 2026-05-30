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
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge badge-muted">AI-native platform</span>
          <span className="hidden h-1 w-1 rounded-full bg-zinc-600 sm:inline" aria-hidden />
          <span className="page-eyebrow">Multi-stage pipeline</span>
        </div>
        <div className="space-y-1.5 pt-0.5">
          <h1 className="page-title">{APP_NAME}</h1>
          <p className="page-lead">
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
              <CardDescription>
                Plain-language product description — the pipeline compiles it into AppSpec.
              </CardDescription>
            </CardHeader>
            <PromptInput />
            <CardFooter>
              <GenerateButton />
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pipeline</CardTitle>
              <CardDescription>Live stage status, provider mode, and per-stage timing</CardDescription>
            </CardHeader>
            <PipelineStatus />
          </Card>

          <div className="dashboard-meta-stack">
            <JobSummary />
            <CostPanel />
            <ProviderPanel />
          </div>
        </section>

        <section className="dashboard-col dashboard-col-output" aria-label="Output and integrations">
          <AppSpecViewer />
          <Card compact>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Registry connectors available for workflow hooks</CardDescription>
            </CardHeader>
            <IntegrationList />
          </Card>
        </section>
      </div>
    </main>
  );
}
