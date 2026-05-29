import { AppSpecViewer } from "@/components/app-spec";
import { ErrorBanner } from "@/components/errors";
import { StatusBanner } from "@/components/status";
import { IntegrationList } from "@/components/integrations";
import { CostPanel, JobSummary, PipelineStatus } from "@/components/pipeline";
import { GenerateButton, PromptInput } from "@/components/prompt";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { APP_NAME } from "@/config/constants";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{APP_NAME}</h1>
        <p className="text-sm text-foreground/60">
          Natural language → validated AppSpec
        </p>
      </header>

      <StatusBanner />
      <ErrorBanner />

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prompt</CardTitle>
              <CardDescription>Describe the application you want to build</CardDescription>
            </CardHeader>
            <PromptInput />
            <div className="mt-4">
              <GenerateButton />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pipeline</CardTitle>
              <CardDescription>Stage progress</CardDescription>
            </CardHeader>
            <PipelineStatus />
          </Card>

          <JobSummary />
          <CostPanel />
        </section>

        <section className="space-y-4">
          <AppSpecViewer />

          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Available connectors</CardDescription>
            </CardHeader>
            <IntegrationList />
          </Card>
        </section>
      </div>
    </main>
  );
}
