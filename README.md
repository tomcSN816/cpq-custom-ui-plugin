# new-cpq-demo (Claude Code plugin)

Turns "I have a Logik.io blueprint" into a live, deployed demo website — entirely through chatting with Claude Code in plain English. No manual `create-next-app`, no manually creating a GitHub repo, no manually creating a Vercel project.

## What it does

1. Checks you're signed into GitHub and Vercel (via GitHub), opening a browser login/signup flow if not.
2. Asks for your Logik + ServiceNow details, one question at a time.
3. Validates the Logik token/product ID and ServiceNow credentials/account with real API calls **before** writing any files, so a typo gets caught immediately instead of after a deploy fails.
4. Scaffolds a Next.js app for your demo.
5. Tries to build the actual UI around your blueprint's own designed layout (tabs, sections, field types) instead of a generic placeholder, when it can reach that layout.
6. Creates a **brand-new, dedicated GitHub repo** for that demo (every demo gets its own repo) and pushes.
7. Creates a Vercel project, sets all env vars, deploys to production, and hands back a live URL.
8. From then on, just keep talking to Claude Code in that project to make changes — describe what you want, and say something like "push this live" when you want to redeploy. No commands to type, ever.

## Installing

Inside an existing Claude Code session (easiest — no separate terminal step):
```
/plugin add https://github.com/tomcSN816/cpq-custom-ui-plugin.git
```

Or from a terminal, before starting Claude Code:
```bash
claude plugin install https://github.com/tomcSN816/cpq-custom-ui-plugin.git
```

Claude Code may tell you to run `/reload-plugins` to activate it.

## Using it

Start a new demo:
```
/new-cpq-demo:create-cpq-demo
```

You'll be asked for your Logik base URL, token, product ID, and ServiceNow instance/credentials/account name — have those ready. Everything else (GitHub, Vercel, the actual build) happens for you.

Once it's live, just describe what you want changed — "show these as cards," "add a field for X," "make the header blue" — and ask Claude to "push this live" whenever you want your changes to go out.

## Getting help

If something looks wrong (a field behaving oddly, a deploy failing, the quote submission erroring), just describe what you're seeing to Claude Code in the demo's own project — it can inspect the live API responses and figure out what's actually happening rather than guessing.
