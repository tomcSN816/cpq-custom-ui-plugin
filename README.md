# new-cpq-demo (Claude Code plugin)

Turns "I have a Logik.io blueprint" into a live, deployed demo website — entirely through chatting with Claude Code in plain English. No manual `create-next-app`, no manually creating a GitHub repo, no manually creating a Vercel project.

## What it does

1. Checks the teammate is signed into GitHub and Vercel (via GitHub), opening a browser login/signup flow if not.
2. Asks for their Logik + ServiceNow details, one question at a time.
3. Validates the Logik token/product ID and ServiceNow credentials/account with real API calls **before** writing any files.
4. Scaffolds a Next.js app (the structure from `FRONTEND_BUILD_GUIDE.md`) into `~/cpq-demos/<demo-name>`.
5. Creates a **brand-new, dedicated GitHub repo** for that demo (never reuses one repo across demos) and pushes.
6. Creates a Vercel project, sets all env vars, deploys to production, and hands back the live URL.
7. From then on, the teammate just keeps talking to Claude Code in that project folder to make changes, and says something like "push this live" when ready to redeploy — no commands typed by them, ever.

## Structure

```
new-cpq-demo/
├── .claude-plugin/plugin.json      # plugin manifest
├── skills/create-cpq-demo/
│   ├── SKILL.md                    # the full instructions Claude follows
│   ├── scripts/
│   │   ├── check_logik.sh          # validates Logik base URL/token/product ID
│   │   └── check_servicenow.sh     # validates SN creds + account name
│   └── templates/                  # the bundled Next.js app skeleton
└── README.md
```

## Testing it yourself first

```bash
claude --plugin-dir /Users/tom.champlin/new-cpq-demo-plugin
```

Then in that Claude Code session, run:

```
/new-cpq-demo:create-cpq-demo
```

Walk through it once end-to-end against a real (or throwaway) Logik product + ServiceNow instance before sharing with the team.

## Sharing with teammates

Push this directory to its own GitHub repo (e.g. `your-org/new-cpq-demo-plugin`). No `marketplace.json` needed — a bare repo with `.claude-plugin/plugin.json` is installable directly. Teammates then install it one of two ways:

**Inside an existing Claude Code session** (easiest for non-technical teammates — no separate terminal step):
```
/plugin add https://github.com/your-org/new-cpq-demo-plugin
```

**From a regular terminal, before starting Claude Code:**
```bash
claude plugin install https://github.com/your-org/new-cpq-demo-plugin
```

Either way, Claude Code may say to run `/reload-plugins` to activate it. After that, they just type `/new-cpq-demo:create-cpq-demo` in any session and answer questions in English.

## Notes / things to revisit

- **Prerequisites the script assumes**: Node.js, `gh` CLI, `vercel` CLI. Missing `node`/`npm` stops the flow with instructions; missing `gh`/`vercel` are installed or the user is told how to install them.
- **One repo per demo, by design** — each teammate ends up with their own GitHub repos, not shared ones. If repo sprawl becomes a problem later, that's a policy change to `SKILL.md` Step 4, not a rebuild.
- **Credentials are typed in manually** — the skill doesn't assume Logik MCP tools are configured, since not every teammate will have them. If MCP Logik tools *are* available in a session, the skill will opportunistically use them to look up a product ID by name, but never requires them.
- **No industry-specific templates yet** — one generic template; per-demo customization (telco, financial services, etc.) happens conversationally after scaffolding.
- **The BOM is fetched via a dedicated endpoint, not the field-update response** — Logik's `PATCH /api/{uuid}` often returns `products: null` and no `total` even when the update itself succeeds; `useConfigurator` calls `GET /api/{uuid}/bom` after every init/update instead. **That endpoint's `bomType` query param is mandatory, not optional** — calling it with no filter returns a separate snapshot that is never invalidated by field updates (verified empirically: it can sit stale indefinitely, this is not a recalculation delay). The bundled route defaults to `bomType=SALES`; override it if a blueprint uses a custom BOM type name. If you're debugging a "BOM looks stale/empty/never-updates after a selection" report in a generated demo, start here.
- **Mapping the BOM into ServiceNow quote line items needs to preserve the bundle hierarchy, not flatten it** — `products` includes structural grouping/container nodes (e.g. "Cash Management," "Add-Ons") alongside real sellable line items; a container's `rollUpPrice` is just the sum of its children's prices, so creating it as a line item at that price *alongside* its children double-counts the cost. The fix isn't to drop containers — it's to still create them as real line items (so the quote's hierarchy matches the configurator's), price them at `0`, and link everything via `sn_quote_mgmt_core_quote_line_item`'s `parent_line_item`/`top_line_item` reference fields (it also has `bom_line_id`/`parent_bom_line_id` string fields for correlating back to the BOM's own `uniqueIdentifier`s — the bundled route populates both). Detect a container by checking whether any *other* product in the BOM lists it as `parentProduct`; a node with no `parentProduct` defaults under the root rather than being left dangling. Line items must be created in parent-before-child order (the route does this with a dependency-ordered loop, not by assuming `level` is contiguous) so each child can reference its already-created parent's `sys_id`. Also expect many BOM item names (bundle components, add-ons) to have no matching `sn_prd_pm_product_offering` record by that name — that's a catalog-modeling question specific to each demo's SN instance, not a bug in this code; the route leaves `product_offering` blank rather than failing the whole quote when no match is found.
- **A literal `$` in a secret written to `.env` gets silently truncated** — Next.js's `.env` loader treats an unescaped `$NAME` as a variable reference and replaces it with an empty string if no such variable exists, with no error. This actually happened with a generated ServiceNow password, which broke auth and then got misreported as "account not found" (the API route now checks `response.ok` before parsing, so a real auth failure surfaces as one). Always escape `$` as `\$` when writing a secret into `.env` — see `SKILL.md` Step 3 and the note in `.env.example`.
- **Blueprint layouts can disagree with the runtime `editable` flag** — a field can be `editable: "true"` on the wire while the blueprint's layout still designates it `ReadOnlyText`/`ReadOnlyCurrency`. `FieldControl`'s `readOnly` prop exists to let a layout-driven UI override the wire flag; don't rely on `editable` alone (see SKILL.md Step 4).
