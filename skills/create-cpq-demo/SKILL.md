---
name: create-cpq-demo
description: Scaffold, connect, and deploy a new Logik.io + ServiceNow CPQ demo front end from scratch, ending with a live URL. Use when the user wants to start a new CPQ demo, connect a Logik blueprint to a front end, or build a demo website for a product configurator.
disable-model-invocation: true
allowed-tools: Bash Read Write Edit
---

# Create a new CPQ demo

You are walking a teammate — who may not be technical — through turning a Logik.io blueprint into a live, deployed demo website. They should never need to see or type a raw git/gh/vercel command themselves; you run everything and narrate in plain English. Talk them through it one question at a time, don't dump a giant form at once.

Everything below refers to `${CLAUDE_SKILL_DIR}` — the directory this SKILL.md lives in. The bundled app skeleton is at `${CLAUDE_SKILL_DIR}/templates/` and the validation scripts are at `${CLAUDE_SKILL_DIR}/scripts/`.

## Step 0 — Check prerequisites

Run these and handle each case:

```bash
node --version
npm --version
```

If either is missing, tell the user they need Node.js installed first (point them to nodejs.org) and stop — everything downstream depends on it.

```bash
gh auth status
```

- If this fails or says not logged in: tell the user "You're not signed into GitHub yet — I'm opening a login flow. If you don't have a GitHub account, this same flow lets you create one." Then run `gh auth login --web` and wait for it to complete. If `gh` itself isn't installed, tell them to install it (`brew install gh` on Mac) and stop.

```bash
vercel whoami
```

- If this fails: tell the user "Now I need you signed into Vercel — I'll open that next. When it asks how to sign in, choose 'Continue with GitHub' so you're not creating a second separate account." Then run `vercel login`. If `vercel` isn't installed, run `npm install -g vercel` first (ask before installing anything globally).

Do not proceed past this step until both `gh` and `vercel` report a logged-in identity.

## Step 1 — Ask for the demo details

Ask for these one at a time, in plain language (don't use these exact field names verbatim — translate to a natural question):

1. **Demo name** — short, will become the folder/repo/site name (e.g. "acme-corp-demo"). Slugify it yourself (lowercase, hyphens) — don't make them think about slugs.
2. **Logik base URL** (e.g. `https://theirinstance.logik.io`)
3. **Logik API token**
4. **Logik product ID** (the configured product UUID for their blueprint). If they don't know it and you have Logik MCP tools available in this session, offer to look it up for them by product name instead of making them hunt for a UUID. If no MCP tools are available, just take the UUID from them directly.
5. **Pricebook ID** — optional, ok to skip.
6. **ServiceNow instance URL**
7. **ServiceNow username / password**
8. **ServiceNow account name** — the `customer_account` record name their quotes should attach to.

## Step 2 — Validate before writing anything

Run both checks with the values collected. Treat these as gating — do not scaffold or deploy on a failed check, instead tell the user plainly what failed and ask them to correct it.

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/check_logik.sh" "<base_url>" "<token>" "<product_id>" "http://localhost:3000"
```

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/check_servicenow.sh" "<instance_url>" "<username>" "<password>" "<account_name>"
```

**If the Logik check fails with an empty-body 403** (as opposed to a JSON error body, or a 401), this is almost always an **Origin allowlist** problem, not a bad token or product ID: some Logik instances restrict the runtime API to a specific list of allowed Origins (visible as an "Origins" section in the Logik admin console for that instance), and the default guess of `http://localhost:3000` may not be on it. Tell the user plainly what's happening and ask them to check that section and add `http://localhost:3000` (for local dev) to it, then retry the check with that same origin value. Remember the working origin value — you'll need it again in Step 6 for the production URL.

Summarize the result for the user in one sentence each ("Logik connection confirmed" / "ServiceNow connection confirmed") — don't paste the raw curl output at them unless something failed and they ask for detail.

## Step 3 — Scaffold the project

Pick a working directory. Default to `~/cpq-demos/<demo-name>` unless the user says otherwise (ask once, don't belabor it).

```bash
mkdir -p ~/cpq-demos/<demo-name>
cp -r "${CLAUDE_SKILL_DIR}/templates/." ~/cpq-demos/<demo-name>/
cd ~/cpq-demos/<demo-name>
```

Write `.env` in that directory (not `.env.example`) with the real values collected in Step 1:

```
LOGIK_BASE_URL="<base_url>"
LOGIK_TOKEN="<token>"
LOGIK_ORIGIN="http://localhost:3000"
NEXT_PUBLIC_LOGIK_PRODUCT_ID="<product_id>"
NEXT_PUBLIC_LOGIK_PRICEBOOK_ID="<pricebook_id or blank>"
SN_INSTANCE="<instance_url>"
SN_USERNAME="<username>"
SN_PASSWORD="<password>"
SN_ACCOUNT_NAME="<account_name>"
```

Then install dependencies:

```bash
npm install
```

## Step 4 — Try to use the blueprint's actual designed layout

Before falling back to the generic starter page, make a real effort to build the UI around the blueprint's own designed layout, if one exists and you can reach it. This produces a far better starting point than a flat field list — Logik blueprints are often designed with tabs, sections, and specific field widgets (pickers, sliders, grids) that reflect how the product is actually meant to be presented.

1. Check whether any Logik MCP tools are connected in this session (tool names like `mcp__<connection>__logik_*`). If none are available, skip straight to "If no layout is available" below — don't block or ask the user to set up MCP just for this.
2. If MCP tools are available, find which connection (if any) points at the same Logik org as `<base_url>`/`<instance_url>` — you can cross-check with `snow_get_current_instance` per connection prefix, the same way you'd match instances for troubleshooting.
3. Find the blueprint behind this product: search/list configurable products (e.g. `logik_list_configurable_products`) for one matching `<product_id>`, and read its `blueprintVariableName`.
4. Call `logik_get_blueprint_layouts` for that blueprint name to see what layouts exist. If there's more than one, prefer the one most likely intended for the runtime configurator (skip layouts that look admin-only), or ask the user which to use if it's genuinely ambiguous.
5. Call `logik_get_blueprint_layout` for the chosen layout. The response includes a raw CSV (`layoutContent`) with a header like `type,path,override source label? (Y/N),label,variablename,Component display type,columnorder,classname,value,placeholder` — **systematically extract every field row's `variablename`, `Component display type`, AND `label`**, not just the ones for fields you happen to be looking at. Doing this exhaustively up front (rather than checking fields one at a time as you build the UI) is what catches fields that look like they'd obviously be one type but are actually another — e.g. a field named "Client Name" or "Client Tier" holding a plain text/label value can still be `Number`/`Picklist`/etc. under the hood, or vice versa. Treat the CSV as ground truth over any assumption based on a field's variable name, the shape of its current value, or a label you'd guess yourself — **use the blueprint's own `label` column verbatim in the UI, don't paraphrase it.** The CSV also has tab-level and section-level rows (their own `label` values) — use those verbatim too for tab/section headings.
6. Build `src/components/ConfiguratorDemo.jsx` to mirror that structure as closely as reasonably possible: tabs for top-level groups, sections within tabs, fields laid out in the same columns/order, and a sensible React control per widget type — all wired to the existing `fields`, `update`, and `updatePickerSelect` from `useConfigurator()`. Keep the BOM sidebar and Submit Quote button from the base template; they don't come from the layout. `FieldControl.jsx` (bundled in this template) is a generic per-field renderer driven by `dataType`/`optionSet` — reuse it rather than writing bespoke controls per field, and pass it a per-field config object (name, label, and any widget override) rather than hand-writing JSX per field.
7. **The API's `editable` flag is not the same thing as the layout's `ReadOnlyText`/`ReadOnlyCurrency` widget type** — a field can be `editable: "true"` on the wire while the layout still intends it as a computed/informational display. Don't rely on `editable` alone to decide what's read-only; carry the layout's widget type into your per-field config (e.g. a `readOnly: true` flag) and pass that to `FieldControl`, which accepts a `readOnly` prop for exactly this case.

**If no layout is available** (no MCP tools connected, no matching connection found, blueprint/layout lookup fails, or the layout content isn't something you can confidently map to a UI), don't get stuck — just leave the template's default starter page as-is (the field-list + BOM sidebar placeholder) and say so plainly to the user, e.g. "I couldn't pull a designed layout for this blueprint, so I've left the generic starter page in place — describe what you'd like built and I'll take it from there." This is a best-effort enhancement, not a gate on finishing the rest of setup.

## Step 5 — Create a dedicated GitHub repo for this demo

Important: every demo gets **its own new repo** — do not reuse or accumulate demos inside one shared repo.

```bash
cd ~/cpq-demos/<demo-name>
git init
git add .
git commit -m "Initial scaffold for <demo-name> CPQ demo"
gh repo create <demo-name> --private --source=. --push
```

If `gh repo create` fails because the name is taken, ask the user for a different name (e.g. append their initials) and retry — don't silently pick something for them.

## Step 6 — Create the Vercel project and deploy

```bash
cd ~/cpq-demos/<demo-name>
vercel link --yes
```

Then push each env var into the Vercel project (repeat per variable, for both production and preview environments):

```bash
printf '%s' "<value>" | vercel env add <VAR_NAME> production
printf '%s' "<value>" | vercel env add <VAR_NAME> preview
```

Do this for all variables from the `.env` file above — set `LOGIK_ORIGIN` to `http://localhost:3000` for now, we'll fix it below. Then deploy:

```bash
vercel --prod --yes
```

Capture the production URL from the output.

**Now update `LOGIK_ORIGIN` to the real production URL** — the value used locally (`http://localhost:3000`) won't be on the Logik instance's Origin allowlist in production:

```bash
vercel env rm LOGIK_ORIGIN production --yes
printf '%s' "<production_url>" | vercel env add LOGIK_ORIGIN production
vercel --prod --yes
```

Tell the user they need to add `<production_url>` to the Origins allowlist in the Logik admin console for this instance (the same place they added `http://localhost:3000` during Step 2), or Logik calls from the live site will 403 the same way the local check did before that was fixed.

Give the user the production URL directly. Confirm the site loads (you can `curl -sI <url>` and check for a 200/30x, though a 401 from Vercel's deployment-protection is also fine to just note).

## Step 7 — Wrap up

Tell the user, in plain language:
- Their live URL.
- That the starter page is intentionally minimal (`src/components/ConfiguratorDemo.jsx` has TODOs) — they can just describe what they want changed and you'll edit it.
- That whenever they want to update the live site, they can just say "push this live" (or similar) and you'll commit, push, and redeploy — they never need to run a command themselves.
- That they can see changes locally before pushing anything live by just asking you to "start the dev server" — offer to do this proactively now rather than waiting to be asked.

If they want to see it locally, run `npm run dev` in the background (it's a long-running process — always background it, never run it in the foreground) and give them `http://localhost:3000` to open. Note that `.env` changes need the dev server restarted to take effect, but ordinary code edits hot-reload automatically.

## Handling "push this live" in a later conversation

When asked to publish/deploy/update the live demo from inside an existing demo's project directory (not a fresh `/new-cpq-demo` run):

```bash
git add -A
git commit -m "<short description of what changed>"
git push
vercel --prod --yes
```

If any new env vars were introduced since the last deploy, add them with `vercel env add` (as in Step 6) before running `vercel --prod --yes`. Report the resulting URL back to the user.
