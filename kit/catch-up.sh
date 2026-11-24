#!/bin/sh
# Rattrapage : copie dans votre application l'état complet du code à la fin d'une étape.
# Usage : sh catch-up.sh 03   (01 à 08). Vos fichiers modifiés sont écrasés : committez avant.
# Les fichiers devenus inutiles à cette étape (listés dans obsolete/NN.txt, ex. useCart.ts après l'étape 03)
# sont supprimés : sinon ils restent, peuvent être importés par erreur et faire échouer lint ou tests.
# Le script peut être relancé sans danger (idempotent). Compatible sh / Git Bash : pas de rsync.
set -eu
STEP=${1:-}
HERE="$(cd "$(dirname "$0")" && pwd)"
case "$STEP" in
  01) SRC="$HERE/app" ;;
  02|03|04|05|06|07|08) SRC="$HERE/solutions/$STEP" ;;
  *) echo "Étape inconnue : « $STEP ». Choisissez 01, 02, 03, 04, 05, 06, 07 ou 08."; exit 1 ;;
esac
DEST=${VUE_SHOP_DIR:-$HOME/byte-layers/vue/shop}
[ -d "$SRC" ] || { echo "L'état de l'étape $STEP n'existe pas dans le kit."; exit 1; }
mkdir -p "$DEST"
cp -R "$SRC/." "$DEST/"
# Suppression des fichiers obsolètes des étapes 02 à $STEP (jamais un fichier que l'état d'arrivée contient).
if [ "$STEP" != "01" ]; then
  for LIST in "$HERE"/obsolete/*.txt; do
    [ -f "$LIST" ] || continue
    N=$(basename "$LIST" .txt)
    [ "$N" \> "$STEP" ] && continue
    while IFS= read -r FILE || [ -n "$FILE" ]; do
      FILE=$(printf '%s' "$FILE" | tr -d '\r')
      case "$FILE" in ''|'#'*) continue ;; esac
      [ -e "$SRC/$FILE" ] && continue
      if [ -e "$DEST/$FILE" ]; then rm -f "$DEST/$FILE"; echo "Supprimé (obsolète) : $FILE"; rmdir "$(dirname "$DEST/$FILE")" 2>/dev/null || true; fi
    done < "$LIST"
  done
fi
(cd "$DEST" && npm install --no-audit --no-fund >/dev/null)
echo "État de fin d'étape $STEP copié dans $DEST, dépendances installées. Relisez git status, puis committez."
