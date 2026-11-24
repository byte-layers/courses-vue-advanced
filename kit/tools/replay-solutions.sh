#!/usr/bin/env bash
# Rejoue le parcours de l'apprenant dans un dossier temporaire, pour chaque étape disponible.
#
#   bash kit/tools/replay-solutions.sh          # 01 (le starter) puis toutes les étapes qui ont un dossier solutions/NN
#   bash kit/tools/replay-solutions.sh 03 04    # seulement ces étapes (06-option est rejouée avec 06)
#   KEEP=1 bash kit/tools/replay-solutions.sh     # garde le dossier temporaire (pour enquêter)
#   OFFLINE=1 ...                               # npm --prefer-offline
#
# Pour chaque étape NN :
#   A. l'état de départ = solutions/(NN-1) (ou app/ pour 02) + le contenu de steps/NN ;
#      on y installe les dépendances de steps/NN/DEPS ;
#   B. phase rouge : type-check passe (les squelettes compilent) et AUCUN test des fichiers
#      fournis ne passe (le squelette est refusé). Les fichiers de test fournis sont les *.spec.ts
#      et les *.test-d.ts (tests de types). Exceptions : les fichiers listés dans steps/NN/GREEN (tests
#      déjà existants, mis à jour : ils doivent rester verts) ; un fichier dont les tests sont des `it.todo`
#      (étape 08, c'est l'apprenant qui écrit) ne doit contenir aucun test réussi, et c'est
#      `steps/08/mutate.mjs` qui doit refuser l'état vide (code de sortie != 0) ;
#   C. phase verte : solutions/NN seule, `npm ci` puis type-check, lint, test, build : tout à 0
#      (et `node mutate.mjs` à 0 si l'étape en fournit un) ;
#   D. cohérence : les fichiers de steps/NN qui ne sont pas des squelettes (pas de « À écrire »)
#      sont identiques à ceux de solutions/NN ; ni node_modules ni dist dans le kit.
# Étape à option (steps/06-option) : départ = solutions/06 + steps/06-option (l'apprenant a fini le
# cœur, pas l'option) ; la phase verte est celle de solutions/06.
# En plus : `src/shared/events.ts` de chaque solution (et de steps/05) doit être identique à kit/shared/events.ts.
# Chaque code de sortie est lu et affiché ; le script sort avec 1 au premier écart.

KIT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/replay-vue.XXXXXX")"
NPM_FLAGS="--no-audit --no-fund --loglevel=error"
[ -n "$OFFLINE" ] && NPM_FLAGS="$NPM_FLAGS --prefer-offline"
FAILED=0

say() { printf '%s\n' "$*"; }
fail() { say "  ECHEC : $*"; FAILED=1; }

# run <log> <commande...> : lance, écrit la sortie dans <log>, retourne le VRAI code de sortie.
run() { log="$1"; shift; "$@" >"$log" 2>&1; return $?; }

copy_tree() { rsync -a --exclude '/node_modules' --exclude '/dist' "$1/" "$2/"; }

# Lit un champ numérique du JSON de Vitest pour un fichier de test, -1 si illisible.
json_field() {
  node -e '
    const r = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    console.log(r[process.argv[2]] ?? -1);
  ' "$1" "$2" 2>/dev/null || echo -1
}

# L'étape 01 est le starter lui-même (kit/app) : il doit être vert tel quel.
if [ "$#" -gt 0 ]; then STEPS="$*"; else STEPS="01 $(ls "$KIT/solutions" 2>/dev/null | sort | tr '\n' ' ')"; fi
[ -n "$STEPS" ] || { say "Aucune solution dans $KIT/solutions"; exit 1; }

# Un dossier de départ propre pour l'étape $1.
previous_of() {
  n=$((10#$1 - 1)); prev=$(printf '%02d' "$n")
  if [ -d "$KIT/solutions/$prev" ]; then echo "$KIT/solutions/$prev"
  elif [ "$prev" = "01" ]; then echo "$KIT/app"
  else echo ""; fi
}

# Phase rouge : red_phase <étape> <dossier steps> <dossier de départ (état précédent)> <log>
red_phase() {
  local N="$1" STEP="$2" PREV="$3" L="$4"
  local W="$TMP/start-$N"; mkdir -p "$W"
  copy_tree "$PREV" "$W"; copy_tree "$STEP" "$W"
  rm -f "$W/DEPS" "$W/GREEN"
  cd "$W" || exit 1
  if [ -f "$PREV/package-lock.json" ]; then run "$L/a-install.log" npm ci $NPM_FLAGS; else run "$L/a-install.log" npm install $NPM_FLAGS; fi
  rc=$?; say "  [rouge] npm ci (état de départ)               exit=$rc"; [ $rc -eq 0 ] || { fail "installation ($L/a-install.log)"; return 1; }
  if [ -f "$STEP/DEPS" ]; then
    while read -r line; do
      [ -z "$line" ] && continue
      case "$line" in \#*) continue;; esac
      run "$L/a-deps.log" npm install -E $line $NPM_FLAGS
      rc=$?; say "  [rouge] npm install -E $line   exit=$rc"; [ $rc -eq 0 ] || { fail "dépendance $line ($L/a-deps.log)"; return 1; }
    done <"$STEP/DEPS"
  fi
  run "$L/b-typecheck.log" npm run type-check
  rc=$?; say "  [rouge] type-check des squelettes (attendu 0)  exit=$rc"; [ $rc -eq 0 ] || { fail "les squelettes ne compilent pas ($L/b-typecheck.log)"; tail -15 "$L/b-typecheck.log"; }
  # chaque fichier de test fourni doit être entièrement rouge
  for spec in $(cd "$STEP" && find . \( -name '*.spec.ts' -o -name '*.test-d.ts' \) | sed 's#^\./##' | sort); do
    run "$L/b-$(echo "$spec" | tr / _).log" npx vitest run "$spec" --reporter=json --outputFile="$L/b-result.json"
    rc=$?; ok=$(json_field "$L/b-result.json" numPassedTests); todo=$(json_field "$L/b-result.json" numTodoTests)
    if [ -f "$STEP/GREEN" ] && grep -qxF "$spec" "$STEP/GREEN"; then
      say "  [rouge] $spec : exit=$rc, réussis=$ok (test existant mis à jour : attendu exit=0, il doit rester vert)"
      if [ $rc -ne 0 ]; then fail "$spec (liste GREEN) devrait être vert sur l'état de départ"; fi
    elif grep -q 'it\.todo(' "$STEP/$spec"; then
      say "  [rouge] $spec : exit=$rc, réussis=$ok, à écrire (todo)=$todo (attendu : 0 réussi, des todo ; c'est mutate.mjs qui refuse)"
      if [ "$ok" != "0" ] || [ "$todo" = "0" ] || [ "$todo" = "-1" ]; then fail "$spec : l'état vide doit être des it.todo sans test réussi"; fi
    else
      say "  [rouge] $spec : exit=$rc, tests réussis=$ok (attendu : exit!=0 et 0 réussi)"
      if [ $rc -eq 0 ] || [ "$ok" != "0" ]; then fail "$spec n'est pas entièrement rouge sur le squelette"; fi
    fi
  done
  if [ -f "$STEP/mutate.mjs" ]; then
    run "$L/b-mutate.log" node mutate.mjs
    rc=$?; say "  [rouge] node mutate.mjs sur l'état vide (attendu : exit!=0)  exit=$rc"
    [ $rc -ne 0 ] || fail "mutate.mjs accepte un état vide ($L/b-mutate.log)"
  fi
  cd "$KIT" || exit 1
}

for N in $STEPS; do
  say ""
  say "=== Étape $N ==="
  SOL="$KIT/solutions/$N"; STEP="$KIT/steps/$N"; L="$TMP/logs-$N"; mkdir -p "$L"
  [ "$N" = "01" ] && SOL="$KIT/app"
  [ -d "$SOL" ] || { fail "solutions/$N introuvable"; break; }

  # --- A + B : phase rouge ---------------------------------------------------------------
  if [ -d "$STEP" ]; then
    PREV="$(previous_of "$N")"
    [ -n "$PREV" ] || { fail "pas d'état de départ pour l'étape $N (solutions/$(printf '%02d' $((10#$N-1))) manquant)"; break; }
    red_phase "$N" "$STEP" "$PREV" "$L" || break
  else
    say "  (pas de steps/$N : pas de phase rouge)"
  fi

  # --- C : phase verte -------------------------------------------------------------------
  G="$TMP/solution-$N"; mkdir -p "$G"; copy_tree "$SOL" "$G"; cd "$G" || exit 1
  if [ -f package-lock.json ]; then run "$L/c-install.log" npm ci $NPM_FLAGS; else run "$L/c-install.log" npm install $NPM_FLAGS; fi
  rc=$?; say "  [vert]  npm ci                                 exit=$rc"; [ $rc -eq 0 ] || { fail "installation de la solution ($L/c-install.log)"; continue; }
  for c in type-check lint test build; do
    run "$L/c-$c.log" npm run $c
    rc=$?; say "  [vert]  npm run $c$(printf '%*s' $((24 - ${#c})) '')exit=$rc"
    if [ $rc -ne 0 ]; then fail "$c a échoué ($L/c-$c.log)"; tail -25 "$L/c-$c.log"; fi
  done
  summary=$(grep -E '^ +Tests ' "$L/c-test.log" | tail -1); say "  [vert]  $summary"
  if [ -f "$STEP/mutate.mjs" ]; then
    run "$L/c-mutate.log" node mutate.mjs
    rc=$?; say "  [vert]  node mutate.mjs                        exit=$rc"
    if [ $rc -ne 0 ]; then fail "mutate.mjs a échoué sur la solution ($L/c-mutate.log)"; tail -25 "$L/c-mutate.log"; fi
    tail -3 "$L/c-mutate.log" | sed 's/^/          /'
    # la solution doit être restée intacte après les mutations
    (cd "$G" && for f in $(cd "$SOL" && find src -type f | sort); do cmp -s "$SOL/$f" "$G/$f" || echo "    modifié : $f"; done) | head -3 | grep . && fail "mutate.mjs n'a pas restauré les fichiers"
  fi

  # --- D : cohérence ---------------------------------------------------------------------
  if [ -d "$STEP" ]; then
    for f in $(cd "$STEP" && find . -type f ! -name DEPS ! -name GREEN | sed 's#^\./##' | sort); do
      if grep -q 'À écrire' "$STEP/$f"; then continue; fi
      if ! cmp -s "$STEP/$f" "$SOL/$f"; then fail "steps/$N/$f (fichier fourni) diffère de solutions/$N/$f"; fi
    done
  fi
  cd "$KIT" || exit 1

  # --- étape à option : steps/NN-option (départ = solutions/NN + l'option en squelette) ------
  OPT="$KIT/steps/$N-option"
  if [ -d "$OPT" ]; then
    say ""; say "=== Étape $N, option ==="
    L="$TMP/logs-$N-option"; mkdir -p "$L"
    red_phase "$N-option" "$OPT" "$SOL" "$L" || break
    for f in $(cd "$OPT" && find . -type f ! -name DEPS ! -name GREEN | sed 's#^\./##' | sort); do
      if grep -q 'À écrire' "$OPT/$f"; then continue; fi
      if ! cmp -s "$OPT/$f" "$SOL/$f"; then fail "steps/$N-option/$f (fichier fourni) diffère de solutions/$N/$f"; fi
    done
    say "  (phase verte de l'option : celle de solutions/$N ci-dessus, qui contient l'option)"
  fi
done

# --- le contrat partagé : une seule source, des copies identiques ----------------------------
for copy in $(ls -d "$KIT"/solutions/*/src/shared/events.ts "$KIT"/steps/*/src/shared/events.ts 2>/dev/null); do
  cmp -s "$KIT/shared/events.ts" "$copy" || fail "$copy diffère de kit/shared/events.ts (copiez-le à l'identique)"
done

LEFT="$(find "$KIT/solutions" "$KIT/steps" "$KIT/app" \( -name node_modules -o -name dist -o -name '.env.local' -o -name coverage \) -prune -print 2>/dev/null | grep -v "^$KIT/app/node_modules$")"
if [ -n "$LEFT" ]; then say ""; say "Attention : node_modules, dist, coverage ou .env.local traîne dans le livrable :"; say "$LEFT"; FAILED=1; fi

say ""
if [ $FAILED -eq 0 ]; then say "REPLAY OK ($STEPS)"; else say "REPLAY EN ECHEC (logs : $TMP)"; fi
if [ -z "$KEEP" ] && [ $FAILED -eq 0 ]; then rm -rf "$TMP"; else say "Dossier temporaire conservé : $TMP"; fi
exit $FAILED
