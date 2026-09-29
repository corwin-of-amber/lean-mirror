import { Lazily, Resource, ResourceBundle } from 'wasi-kernel/services';


// @ts-ignore
let expandUser = (fn: string) => fn.replace(/^~/, process.env['HOME']),
    rcsfile = (fn: string, ct?: string) => new Resource(`file://${expandUser(fn)}`, ct);

const LEAN_WORKDIR = `~/var/ext/lean4`;


const packageBundles: {[name: string]: ResourceBundle} = {

    'lean': {
        '/usr/bin/lean': rcsfile(`${LEAN_WORKDIR}/bin/lean.wasm`),
        '/usr/lib/lean/': new Lazily([
            rcsfile(`${LEAN_WORKDIR}/lib/Init.tar`),
            rcsfile(`~/var/tmp/scribble/scribble-build.tar`)
        ]),
        '/usr/lib/lean/Std/': new Lazily(rcsfile(`${LEAN_WORKDIR}/lib/Std.tar`)),
        '/usr/lib/lean/Lean/': new Lazily(rcsfile(`${LEAN_WORKDIR}/lib/Lean.tar`)),
        '/usr/lib/lean/Lake/': new Lazily(rcsfile(`${LEAN_WORKDIR}/lib/Lake.tar`)),
        '/dev/urandom': '+'.repeat(8192),
        '/etc/localtime': rcsfile('/etc/localtime'),  /* using local system's?.. */
    },

    'sample-programs': {
        '/home/a.lean': 'module\n\ndef n : Nat := 0\n#check n + 0\n',
        '/home/knaves.lean': rcsfile(`~/var/ext/lean4/tmp/knaves.lean`),
        '/home/player.lean': rcsfile(`~/var/tmp/scribble/player.lean`),

        '/home/': rcsfile('~/var/tmp/scribble/scribble-build-gamedata.tar'),
    }
}



export { rcsfile }


export default packageBundles