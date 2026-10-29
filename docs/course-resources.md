# Project-bound database and storage

The shipped `.mcp.json` and `.codex/config.toml` both use
`.agents/scripts/comwit-mcp.mjs`. Read the project setup prompt and `AGENTS.md`.
The bridge gets project context from `.env`; never print it or read secret values
into a conversation. Missing context requires the user's Comwit setup prompt and
local `comwit login` flow before tools can be called. `COMWIT_PROJECT_ID` is the
MCP application project; `COMWIT_PROJECT` is the Cloud project. Do not interchange
them or guess either value. No MCP PAT or new server registration is required.

The following names and input shapes are verified in Comwit's project MCP source
(`src/server/mcp/project-handler.ts`). Discover the live tool list each time:
setup tools disappear once bound, and another installation may not expose them.

| Tool                      | Input                                                                 | Use                                                                                                                           |
| ------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `list_cloud_resources`    | `{}`                                                                  | Read the current project's bound resources/status without changing them.                                                      |
| `get_local_env`           | `{}`                                                                  | Recover the local environment through returned `nextSteps`.                                                                   |
| `setup_database`          | `{}` or `{"name":"user-approved-name"}`                               | No name: inspect/missing without creating. With a name: create and bind if missing, reuse the existing binding otherwise.     |
| `setup_storage`           | `{}` or `{"name":"user-approved-globally-unique-name","public":true}` | Create/bind only when approved and needed; choose public course-media storage or private storage to match the user's intent. |
| `sync_cloud_resource_env` | `{"resource":"database"}` or `{"resource":"storage"}`                 | Synchronize an existing ready binding when exposed; follow returned local merge commands.                                     |

1. Confirm the active project from trusted setup context. Inspect current bindings
   with `list_cloud_resources`. Reuse them; these tools cannot choose or switch to
   arbitrary unbound resources. Missing context/tools is a blocker for connection,
   not permission to fall back to another account or production CLI.
2. Explain the needed DB/storage and get authorization for creation/binding unless
   already explicitly authorized. Use stable names on retries. After an ambiguous
   response inspect bindings before another create attempt.
3. Execute returned `nextSteps` from the project root. The provided merge scripts
   preserve the ignored `.env`. Inspect proposed scaffold writes and preserve the
   existing course schema, migrations, repository code and presign integration;
   resolve a conflict before applying it. Never hand-write DATABASE_URL or tokens.
4. On `not_ready`, recheck `list_cloud_resources` at the server-directed interval
   (currently 30 seconds). Stop on a failed state; after ten unchanged checks leave
   resumable progress and report pending instead of polling indefinitely.
   Use the exposed sync tool after readiness when instructed; `pending` Code env
   application is not a reason to repeatedly save the same environment.
5. Verify the existing server client and storage contract with non-sensitive test
   data only when authorized. Schema migration remains a separate explicit
   approval: generate SQL, review/summarize it, then migrate only after approval.
   Do not seed, charge a payment, send a notification or deploy as part of setup.

Never mark a resource connected based solely on writing `.env` or calling setup.
Check the ready binding and any needed synchronization result. If the user chooses
mock-only work, document that choice and the remaining integration steps.
