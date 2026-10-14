import { EventEmitter } from 'events';
import { Transport } from "@codemirror/lsp-client";

import { System } from 'wasi-kernel';
import { PackageManager, ChildProcess } from "wasi-kernel/services";

import distro from '../distro';
import { JSONRPCTransportStream } from "./json-rpc";


class WasiProcessTransport extends EventEmitter implements Transport {

    workerProcess: ChildProcess
    jts: JSONRPCTransportStream
    handlers: ((message: string) => void)[] = []
    trace = false

    rpc: { sessionId?: string } = {}

    constructor(workerProcess: ChildProcess) {
        super();
        this.workerProcess = workerProcess;
        this.jts = new JSONRPCTransportStream;

        this.jts.digestStream(workerProcess.instance.stdout);

        this.pump().then(() => this.emit('terminated')); // async
    }

    // Handle incoming messages asynchronously
    async pump() {
        for await (let m of this.jts.incoming.consume())
            this._received(m);
        console.error('lsp worker has stopped.')
    }

    send(message: string) {
        let j = JSON.parse(message);
        if (j.method === 'initialize') {
            // overwrite URI (this is specific to GameServer)
            j.params.rootUri = 'MyGame';
            message = JSON.stringify(j);
        }
        if (!['initialized'].includes(j.method)) {
            this._send(message);
        }

        if (j.method === "initialize" && j.id) {
            // A worker does not reply to `initialize`, so synthesize a response
            this._received(JSON.stringify({ id: j.id, jsonrpc: "2.0", result: SERVER_MANIFEST }));
        }

        if (j.method === '$/lean/rpc/call') {
            if (!this.rpc.sessionId) this.emit('initialized');
            this.rpc.sessionId = j.params.sessionId;
        }
    }

    subscribe(handler: (value: string) => void) {
        this.handlers.push(handler);
    }

    unsubscribe(_handler: (value: string) => void) {
        console.warn('unsubscribe');
    }

    _send(message: string) {
        if (this.trace) console.log("↖️", message);
        this.workerProcess?.write(this.jts.formatMessage(message));
    }

    _received(message: string) {
        if (this.trace) console.log("↘️", message);
        for (let h of this.handlers) h(message);
    }
}



const SERVER_MANIFEST =
{
    "capabilities": {
        /*
        "callHierarchyProvider":true,
        "codeActionProvider":{"codeActionKinds":["quickfix","refactor","source.organizeImports"],"resolveProvider":true,"workDoneProgress":false},
        "colorProvider":{"workDoneProgress":false},
        "completionProvider":{"resolveProvider":true,"triggerCharacters":["."]},
        "experimental":{"moduleHierarchyProvider":{},"rpcProvider":{"highlightMatchesProvider":{},"rpcWireFormat":"v1"}},
        "renameProvider":{"prepareProvider":true},
        "signatureHelpProvider":{"triggerCharacters":[" "],"workDoneProgress":false},
        */
        "semanticTokensProvider": {
            "full": true, "legend": {
                "tokenModifiers": ["declaration", "definition", "readonly", "static", "deprecated", "abstract", "async", "modification", "documentation", "defaultLibrary"],
                "tokenTypes": ["keyword", "variable", "property", "function", "namespace", "type", "class", "enum", "interface", "struct", "typeParameter", "parameter", "enumMember", "event", "method", "macro", "modifier", "comment", "string", "number", "regexp", "operator", "decorator", "leanSorryLike"]
            },
            "range": true
        },
        "textDocumentSync": { "change": 2 }, //"openClose":true,"save":{"includeText":true},"willSave":false,"willSaveWaitUntil":false},
        /*
        "declarationProvider":true,"definitionProvider":true,"documentHighlightProvider":true,"documentSymbolProvider":true,
        "foldingRangeProvider":true,"hoverProvider":true,"referencesProvider":true,
        "typeDefinitionProvider":true,"workspaceSymbolProvider":true
        */
    },
    "serverInfo": {
        "name": "Lean 4 Server",
        "version": "0.3.0"
    }
};


class LeanWorkerWASI extends EventEmitter {

  proc?: ChildProcess
  transport?: WasiProcessTransport

  constructor(public wasik?: System) { super(); }

  async start(): Promise<this & {transport: WasiProcessTransport}> {
    let wasik = this.wasik ?? await LeanWorkerWASI.bootWasi();
    this.wasik = wasik;

    this.proc = await this.wasik.runWasix('/usr/bin/lean', {program: 'lean', args: ['--worker'], stdin: {}});
    this.transport = new WasiProcessTransport(this.proc);
    this.transport.on('terminated', () => this.restart());  // auto-restart

    forwardStderr(this.proc);
    return this as this & {transport: WasiProcessTransport};
  }

  async restart() {
    let msg = document.querySelector<HTMLDivElement>('.editor-platform-status-card');
    msg!.innerText = 'Restarting the LSP worker...';

    this.wasik?.reboot();

    let self = await this.start();
    self.transport.on('initialized', () =>
      setTimeout(() => msg!.innerText = '', 1500));
    this.emit('reconnected');
    return self;
  }

  static async bootWasi() {
    let wasik = new System('/node_modules/wasi-kernel/');
    await wasik.startup();
    let pm = new PackageManager(wasik.vfs);

    let prog = document.querySelector<HTMLDivElement>('.editor-platform-secondary-host');
    pm.on('progress', ev => {
      if (ev.uri && ev.download && prog) {
        let fn = ev.uri.replace(/.*[/]/, ''),
            div = [...prog.querySelectorAll('div')]
              .find(e => e.getAttribute('data-uri') == ev.uri);
        
        if (!div) {
          div = document.createElement('div');
          div.setAttribute('data-uri', ev.uri);
          prog.append(div);
        }

        div.innerText = `${fn} «${(ev.download.downloaded / 1e6).toFixed(1)}MB» ${ev.done ? '✓' : ''}`;
      }
    });

    wasik.vfs.options.readonly = true;
    for (let pkg of ['lean', 'sample-programs']) {
      if (distro[pkg]) await pm.install(distro[pkg]);
    }

    return wasik;
  }
}


/**
 * For debugging: direct the process's standard error to the console.
 */
async function forwardStderr(proc: ChildProcess) {
    let r = proc.instance.stderr.getReader(),
        td = new TextDecoder();
    while (true) {
        let chunk = await r.read();
        if (chunk.done) break;
        console.warn(td.decode(chunk.value));
    }
}


export { WasiProcessTransport, LeanWorkerWASI }