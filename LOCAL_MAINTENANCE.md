# Local fork maintenance

This clone keeps local fixes on top of `Leonxlnx/taste-skill`.

- Upstream: `origin` → `https://github.com/Leonxlnx/taste-skill.git` (read only here)
- Personal fork: `fork` → `https://github.com/wangyuehua0429/taste-skill.git`
- Integration branch: `main`
- Stable backup branch: `backup/taste-skill-fc5447f`

The installed Codex skill is a symlink:

```text
~/.codex/skills/design-taste-frontend
→ ~/skills-src/taste-skill/skills/taste-skill
```

## Upgrade while keeping local patches

Start from a clean worktree. Fetch upstream, save the current state on a dated
backup branch, then merge upstream into `main`. A merge preserves the existing
local commits; rebasing rewrites their hashes.

```bash
cd ~/skills-src/taste-skill
git status --short
git fetch origin
git branch "backup/pre-upgrade-$(date +%Y%m%d)" HEAD
git merge --no-edit origin/main
```

Resolve conflicts by behavior, not by taking one side wholesale. If the merge
cannot be completed safely:

```bash
git merge --abort
```

After a successful merge, run the repository checks:

```bash
node tests/frontmatter.mjs
node tests/text-encoding.mjs
node --test tests/profile-cleanup.mjs tests/inspection-files.mjs tests/lint-fragments.mjs
node --test tests/browser-inspect.mjs
node skills/taste-skill/scripts/lint.mjs \
  skills/taste-skill/assets/app.css skills/taste-skill/assets/charts.js
```

The browser test needs Node 22+ and an installed Chrome, Edge or Chromium. If
the scripts moved upstream, update this command list with the new entry points.

## Back up to the personal fork

Push both the integration branch and the stable patch backup without rewriting
remote history:

```bash
git push fork main
git push fork backup/taste-skill-fc5447f
```

Do not force-push either branch unless its history is known to be disposable.

## Reconnect the installed skill

If a Codex upgrade removes the skill link, point it back at the patched clone:

```bash
ln -sfn "$HOME/skills-src/taste-skill/skills/taste-skill" \
  "$HOME/.codex/skills/design-taste-frontend"
readlink "$HOME/.codex/skills/design-taste-frontend"
```

Do not rerun the upstream installer over this clone when local patches must be
kept. Installers may replace the symlink or install an independent copy.
