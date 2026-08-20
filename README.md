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
- **The BOM is fetched via a dedicated endpoint, not the field-update response** — Logik's `PATCH /api/{uuid}` often returns `products: null` and no `total` even when the update itself succeeds; only `GET /api/{uuid}/bom` reliably returns current pricing. `useConfigurator` calls this after every init/update. If you're debugging a "BOM looks stale/empty after a selection" report in a generated demo, start there.
- **Blueprint layouts can disagree with the runtime `editable` flag** — a field can be `editable: "true"` on the wire while the blueprint's layout still designates it `ReadOnlyText`/`ReadOnlyCurrency`. `FieldControl`'s `readOnly` prop exists to let a layout-driven UI override the wire flag; don't rely on `editable` alone (see SKILL.md Step 4).
