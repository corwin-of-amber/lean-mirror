import {
  renderEditorPlatformWorkspaceShell,
} from "@leanprover/editor-platform";
import { StateEffect } from "@codemirror/state"

import { mountLeanEditor } from "./publicLeanEditor";
import './style.css';

import { LeanWorkerWASI } from "./transport/lsp-wasi-process";

import { GameKeeper } from "./extra/game-server";
import backslashReplace from "./extra/backslash";


const documentUri = 'wasi:/home/player.lean',
      languageId = 'lean',
      rootUri = 'wasi:/home';


async function main() {
  if (!global.process?.nextTick)
    global.process = Object.assign(require('process'), {
      nextTick: (f: Function, ...a: any[]) => { Promise.resolve().then(() => f(...a)) },
    })

  initializeKeyBindings();

  const app = requiredElement<HTMLElement>("#app");

  const shell = renderEditorPlatformWorkspaceShell(app, {
    eyebrow: "Minimal public-API experiment (WASI)",
    ids: {
      editor: "minimal-editor",
      info: "lean-infoview",
      status: "minimal-status",
    },
    labels: {
      editorDescription: documentUri,
      editorTitle: "Lean Editor",
      infoAriaLabel: "Lean infoview",
      infoTitle: "Lean Infoview",
      secondaryAriaLabel: "Lean service events",
      secondaryTitle: "Events",
    },
  });

  const editorHost = shell.editorHost as HTMLElement;
    
  const editorMount = document.createElement("div");
  editorMount.className = "minimal-editor-mount";
  editorHost.append(editorMount);

  let editor = await mountLeanEditor({
    document: {
      languageId,
      source: await fetchDocument(documentUri),
      uri: documentUri,
    },
    editorContainer: editorMount,
    infoviewContainer: shell.infoHost as HTMLElement,
    loadDocument: fetchDocument,
    /*onDiagnostics(params) {
      platformStore.setDocumentDiagnostics(
        params.uri,
        params.diagnostics.map((diagnostic) => platformDiagnostic(params.uri, diagnostic)),
      );
    },*/
    onDocumentChange(source, _version) {
      game.navigate(source);
      /*
      platformStore.setDocument(createDocumentSnapshot({
        languageId,
        openState: "open",
        syncState: "dirty",
        uri: documentUri,
        version,
      }));*/
    },
    /*
    onError(error) {
      if (lastSessionPhase !== "failed") {
        leanRuntime.failed(errorMessage(error), { recoverable: true });
      }
    },
    onReconnectStart(reason) {
      leanRuntime.stale(reason);
    },*/
    onSessionState: ev => {
      if (ev.phase === 'ready')
        document.querySelector('#app')?.classList.remove('booting');
    },
    rootUri
  });

  editor.view.dispatch({
    effects: StateEffect.appendConfig.of(backslashReplace()),
  })

  Object.assign(window, { shell, editor });

  let leanWorker = await new LeanWorkerWASI().start(),
      conn = editor.session.connect(leanWorker.transport);


  Object.assign(window, { leanWorker, wasik: leanWorker.wasik });

  leanWorker.on('reconnected', () => {
    conn = editor.session.reconnect(leanWorker.transport);
  });

  // jump to last line
  conn.initialized.then(() => {
    editor.view.dispatch({
      selection: {anchor: editor.view.state.doc.length - 1}
    });
    editor.view.focus();
  });

  let game = new GameKeeper(editor, leanWorker.transport!);
  await game.loadData(leanWorker.wasik!.vfs);

  leanWorker.transport.on('initialized', () => {
      game.navigate(editor.view.state.sliceDoc());
  });

  Object.assign(window, { game });
}
  

async function fetchDocument(uri: string) {
  return (await fetch(uri.replace(/.*[/]/, '/assets/scribble/'))).text();
}

function requiredElement<ElementType extends HTMLElement>(selector: string): ElementType {
  const element = document.querySelector<ElementType>(selector);
  if (!element) {
    throw new Error(`Missing required element ${selector}.`);
  }
  return element;
}


function initializeKeyBindings() {
    window.addEventListener('keydown', (ev) => {
        if (ev.metaKey && ev.code == 'KeyR') (<any>window).k.reload();// typeof k !== 'undefined' ? k.reload() : location.reload();
    }, {capture: true});
}


document.addEventListener('DOMContentLoaded', main);
