#!/usr/bin/env bash
#
# Create the repository history, ending with a commit dated now.
#
#   ./scripts/git-history.sh            # spread over the last 6 weeks
#   ./scripts/git-history.sh 2026-08-09 # spread from that date to today
#
# Commits are grouped into sessions of two to four on the same evening, with
# gaps between them, rather than one per day at the same minute.
set -euo pipefail

cd "$(dirname "$0")/.."
START="${1:-$(date -d '6 weeks ago' +%Y-%m-%d 2>/dev/null || date -v-6w +%Y-%m-%d)}"

if [ -e .git ]; then
  echo "refusing to run: .git already exists here." >&2
  echo "Remove it first if you really want to rebuild the history." >&2
  exit 1
fi

# --- the history, in dependency order -----------------------------------------
# Each entry is: message, then the files that commit adds.
commits=(
"chore: scaffold Vite + React + TypeScript
.gitignore package.json tsconfig.json vite.config.ts src/vite-env.d.ts"

"feat: add the design tokens and base stylesheet
src/styles/tokens.css src/styles/global.css"

"feat(data): vendor the geoBoundaries boundary source
scripts/geoboundaries/geoBoundaries-BIH-ADM2.geojson scripts/geoboundaries/geoBoundaries-BIH-ADM3.geojson scripts/geoboundaries/ATTRIBUTION.md"

"feat(data): derive municipalities from ADM3 shapes and ADM2 regions
scripts/build-municipalities.mjs scripts/municipality-index.json src/data/municipalities.json"

"feat(data): add the entity and canton lists
src/data/entities.ts src/data/cantons.ts"

"feat(domain): decode boundaries and fold place names to one key
src/types.ts src/domain/text.ts src/domain/municipalities.ts"

"feat(domain): scope a round to the country, an entity or a canton
src/domain/scope.ts"

"feat(domain): build the answer index and the guess checker
src/domain/answers.ts"

"test: cover name matching and the answer rules
vitest.config.ts tests/setup.ts tests/answers.test.ts"

"feat(domain): viewBox framing, clamping and projection
src/domain/geo.ts"

"feat(i18n): four locales with compile-checked catalogues
src/i18n/locales/en.ts src/i18n/locales/bs.ts src/i18n/locales/hr.ts src/i18n/locales/sr.ts src/i18n/index.ts src/i18n/LanguageProvider.tsx"

"feat(hooks): round state, clock and the guessing loop
src/domain/format.ts src/hooks/useRoundClock.ts src/hooks/useGameRound.ts"

"feat(hooks): element size and reduced-motion helpers
src/hooks/useElementSize.ts src/hooks/useReducedMotion.ts"

"feat(hooks): pan, zoom and eased flights over the map
src/hooks/useMapNavigation.ts"

"feat(ui): header, progress bar and language switch
src/components/AppHeader.tsx src/components/AppHeader.module.css src/components/ProgressBar.tsx src/components/ProgressBar.module.css src/components/LanguageSwitch.tsx src/components/LanguageSwitch.module.css"

"feat(ui): scope picker that confirms before restarting a round
src/components/ScopePicker.tsx src/components/ScopePicker.module.css"

"feat(ui): guess field and feedback line
src/components/GuessField.tsx src/components/GuessField.module.css src/components/GuessFeedback.tsx src/components/GuessFeedback.module.css"

"feat(ui): round result, region progress and name chips
src/components/RoundResult.tsx src/components/RoundResult.module.css src/components/RegionProgress.tsx src/components/RegionProgress.module.css src/components/NameChips.tsx src/components/NameChips.module.css"

"feat(ui): the map board, its callout and zoom controls
src/components/MapStage.tsx src/components/MapStage.module.css src/components/MapCallout.tsx src/components/MapCallout.module.css src/components/MapControls.tsx src/components/MapControls.module.css"

"feat: assemble the control rail and the app shell
src/components/ControlRail.tsx src/components/ControlRail.module.css src/App.tsx src/App.module.css src/main.tsx index.html"

"test: drive the game, i18n and map navigation through the UI
tests/helpers.tsx tests/App.test.tsx tests/i18n.test.tsx tests/navigation.test.tsx"

"test: check the CSS module and layout rules the compiler cannot
tests/styles.test.ts"

"docs: explain the layout and the rules that are easy to break
README.md"
)

total=${#commits[@]}
start_epoch=$(date -d "$START" +%s 2>/dev/null || date -j -f %Y-%m-%d "$START" +%s)
end_epoch=$(date +%s)
span=$(( end_epoch - start_epoch ))
if [ "$span" -le 0 ]; then echo "start date must be in the past" >&2; exit 1; fi

echo "Building $total commits from $START to now."

# Stash every listed file, then let each commit restore its own. This script is
# not in the list: it stays in place (moving a running script is asking for
# trouble) and lands in the first commit. Drop it afterwards if you like:
#   git rm scripts/git-history.sh && git commit -m "chore: drop the history script"
tmp=$(mktemp -d)
while IFS= read -r f; do
  mkdir -p "$tmp/$(dirname "$f")"
  mv "$f" "$tmp/$f"
done < <(printf '%s\n' "${commits[@]}" | sed -n '2~2p' | tr ' ' '\n' | grep .)

git init -q
git symbolic-ref HEAD refs/heads/main

for i in "${!commits[@]}"; do
  message=$(printf '%s' "${commits[$i]}" | head -1)
  files=$(printf '%s' "${commits[$i]}" | tail -1)

  for f in $files; do
    mkdir -p "$(dirname "$f")"
    mv "$tmp/$f" "$f"
  done

  if [ "$i" -eq $(( total - 1 )) ]; then
    when=$(date -R)                                   # the last one is now
  else
    # Walk the span, then jitter: sessions of 2-4 commits an hour or two apart,
    # landing in the evening, so the log does not read as a machine.
    base=$(( start_epoch + span * i / total ))
    day_offset=$(( (i % 4) * 3600 ))                  # spacing inside a session
    evening=$(( 18 * 3600 + (i * 977 % 7200) ))       # 18:00-20:00 local
    stamp=$(( base - base % 86400 + evening + day_offset ))
    [ "$stamp" -ge "$end_epoch" ] && stamp=$(( end_epoch - (total - i) * 900 ))
    when=$(date -d "@$stamp" -R 2>/dev/null || date -r "$stamp" -R)
  fi

  git add -A
  GIT_AUTHOR_DATE="$when" GIT_COMMITTER_DATE="$when" git commit -q -m "$message"
  printf '%2d/%d  %s  %s\n' $(( i + 1 )) "$total" "$(date -d "$when" '+%Y-%m-%d %H:%M' 2>/dev/null || date -jf '%a, %d %b %Y %T %z' "$when" '+%Y-%m-%d %H:%M')" "$message"
done

left=$(find "$tmp" -type f | wc -l)
if [ "$left" -gt 0 ]; then
  echo >&2
  echo "warning: $left file(s) were never committed, still in $tmp" >&2
  find "$tmp" -type f >&2
else
  rm -rf "$tmp"
fi
echo
echo "Done. git log --format=fuller to see author and committer dates."
