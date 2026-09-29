import { CircleAlertIcon } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { Resource } from "@/lib/api";

export type Crumb = { readonly label: string; readonly href?: string };

type HeaderProps = {
  readonly crumbs?: readonly Crumb[];
  readonly title: string;
  readonly badges?: ReactNode;
  readonly actions?: ReactNode;
  readonly description?: string | null;
  readonly meta?: ReactNode;
  readonly children?: ReactNode;
};

export function PageHeader({ crumbs = [], title, badges, actions, description, meta, children }: HeaderProps) {
  return (
    <header className="flex flex-col gap-3 border-b px-8 pt-5 pb-4">
      {crumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {crumbs.map((crumb, index) => (
              <Fragment key={`${crumb.label}-${index}`}>
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {crumb.href === undefined ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
        {badges}
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </div>
      {description !== undefined && description !== null && description !== "" && (
        <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
      )}
      {meta !== undefined && <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">{meta}</div>}
      {children}
    </header>
  );
}

export function PageBody({ children }: { readonly children: ReactNode }) {
  return <div className="flex flex-col gap-4 px-8 py-5">{children}</div>;
}

export function LoadingPage() {
  return (
    <PageBody>
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <Skeleton className="h-64 w-full" />
    </PageBody>
  );
}

export function ErrorPage({ error }: { readonly error: Error }) {
  return (
    <PageBody>
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CircleAlertIcon />
          </EmptyMedia>
          <EmptyTitle>Couldn't load this page</EmptyTitle>
          <EmptyDescription>{error.message}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </PageBody>
  );
}

// Renders a loaded resource, or its loading and error states.
export function Loaded<Value>({ resource, children }: { readonly resource: Resource<Value>; readonly children: (value: Value) => ReactNode }) {
  if (resource.state === "loading") {
    return <LoadingPage />;
  }

  if (resource.state === "error") {
    return <ErrorPage error={resource.error} />;
  }

  return children(resource.value);
}

export function EmptyList({ title, description }: { readonly title: string; readonly description: string }) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
