#!/bin/sh
# Rattrapage : copie dans votre application l'état complet du code à la fin d'une étape.
# Usage : sh catch-up.sh 03   (01 à 08). Vos fichiers modifiés sont écrasés : committez avant.
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
(cd "$DEST" && npm install --no-audit --no-fund >/dev/null)
echo "État de fin d'étape $STEP copié dans $DEST, dépendances installées. Relisez git status, puis committez."
