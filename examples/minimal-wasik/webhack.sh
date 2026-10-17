#!/bin/bash -e

: ${WASIK:=~/var/workspace/wasi-kernel/wasi-kernel-3}
: ${LEAN_WORKDIR:=~/var/ext/lean4}
: ${SCRIBBLE_WORKDIR:=~/var/tmp/scribble}

npm i $WASIK --no-audit && npm i --no-audit
npx webpack

( cd dist && ln -sf ../node_modules && ln -sf ../assets)

sed s@src/main.ts@main.js@ index.html > dist/index.html

# collect assets
mkdir -p assets/lean4/bin assets/lean4/lib
cp $LEAN_WORKDIR/bin/lean.wasm assets/lean4/bin
cp $LEAN_WORKDIR/lib/{Init,Std,Lean,Lake}.tar assets/lean4/lib

mkdir -p assets/scribble
cp $SCRIBBLE_WORKDIR/scribble-build{,-gamedata}.tar assets/scribble