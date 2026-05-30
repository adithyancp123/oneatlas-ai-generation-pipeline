"use client";

import type { AuthRules, EntityPermission } from "@/types/domain";
import { cn } from "@/lib/utils";

export interface AuthRulesPanelProps {
  auth: AuthRules;
}

const ACTION_BADGE: Record<string, string> = {
  read: "badge-success",
  write: "badge-info",
  delete: "badge-warning",
};

function badgeClassForAction(action: string): string {
  const normalized = action.toLowerCase();
  return ACTION_BADGE[normalized] ?? "badge-muted";
}

function groupPermissionsByRole(permissions: EntityPermission[]): Map<string, EntityPermission[]> {
  const map = new Map<string, EntityPermission[]>();
  for (const perm of permissions) {
    const list = map.get(perm.role) ?? [];
    list.push(perm);
    map.set(perm.role, list);
  }
  return map;
}

export function AuthRulesPanel({ auth }: AuthRulesPanelProps) {
  const permissions = auth.permissions ?? [];
  const roles =
    auth.roles.length > 0
      ? auth.roles
      : permissions.length > 0
        ? [...new Set(permissions.map((p) => p.role))]
        : [];

  const hasRolesOrPermissions = roles.length > 0;

  return (
    <section className="content-section content-section-bordered" aria-label="Auth rules">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="section-heading">Auth rules</h4>
        <span className="badge badge-muted normal-case">{auth.strategy}</span>
      </div>
      <p className="section-subtitle">Roles and entity-level permissions from the AppSpec auth block.</p>

      {!hasRolesOrPermissions ? (
        <p className="text-sm text-zinc-500">No auth rules defined</p>
      ) : (
        <div className="space-y-4">
          {roles.map((role) => {
            const byRole = groupPermissionsByRole(permissions).get(role) ?? [];

            return (
              <div key={role} className="rounded-lg border border-zinc-800/70 bg-zinc-950/25">
                <h5 className="border-b border-zinc-800/70 px-3 py-2 text-sm font-semibold capitalize text-zinc-100">
                  {role}
                </h5>

                {byRole.length === 0 ? (
                  <p className="px-3 py-2.5 text-xs text-zinc-500">No entity permissions for this role</p>
                ) : (
                  <div className="table-shell">
                    <table className="data-table" aria-label={`Permissions for ${role}`}>
                      <thead>
                        <tr>
                          <th scope="col">Entity</th>
                          <th scope="col">Permissions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {byRole.map((perm) => (
                          <tr key={`${role}-${perm.entity}`}>
                            <td className="cell-wrap font-medium text-zinc-200">{perm.entity}</td>
                            <td>
                              <div className="badge-row flex flex-wrap gap-1">
                                {perm.actions.map((action) => (
                                  <span
                                    key={action}
                                    className={cn(
                                      "badge normal-case",
                                      badgeClassForAction(action),
                                    )}
                                  >
                                    {action}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {auth.publicRoutes.length > 0 ? (
        <div className="mt-3">
          <p className="meta-label mb-1.5">Public routes</p>
          <ul className="badge-row flex flex-wrap gap-1">
            {auth.publicRoutes.map((route) => (
              <li key={route}>
                <span className="badge badge-muted font-mono normal-case">{route}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
