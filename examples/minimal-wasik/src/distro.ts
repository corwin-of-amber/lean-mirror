import { Lazily, Resource, ResourceBundle } from 'wasi-kernel/services';


// @ts-ignore
let expandUser = (fn: string) => fn.replace(/^~/, process.env['HOME']),
    rcsfile = (fn: string, ct?: string) => new Resource(`file://${expandUser(fn)}`, ct);
/*
const LEAN_WORKDIR = `~/var/ext/lean4`,
      SCRIBBLE_WORKDIR = `~/var/tmp/scribble`;
*/

const LEAN_WORKDIR = `assets/lean4`,
      SCRIBBLE_WORKDIR = `assets/scribble`;

rcsfile = (fn: string, ct?: string) => new Resource(new URL(fn, window.location.href).href, ct);

const packageBundles: {[name: string]: ResourceBundle} = {

    'lean': {
        '/usr/bin/lean': rcsfile(`${LEAN_WORKDIR}/bin/lean.wasm`),
        '/usr/lib/lean/': new Lazily([
            rcsfile(`${LEAN_WORKDIR}/lib/Init.tar`),
            rcsfile(`${SCRIBBLE_WORKDIR}/scribble-build.tar`)
        ]),
        '/usr/lib/lean/Std/': new Lazily(rcsfile(`${LEAN_WORKDIR}/lib/Std.tar`)),
        '/usr/lib/lean/Lean/': new Lazily(rcsfile(`${LEAN_WORKDIR}/lib/Lean.tar`)),
        '/usr/lib/lean/Lake/': new Lazily(rcsfile(`${LEAN_WORKDIR}/lib/Lake.tar`)),
        '/dev/urandom': '+'.repeat(8192),
    },

    'sample-programs': {
        '/home/': rcsfile(`${SCRIBBLE_WORKDIR}/scribble-build-gamedata.tar`),
    }
}



export { rcsfile }


export default packageBundles