/**
 * This code is specific to hhu-adam's GameServer.
 */
import i18next from 'i18next';
import debounce from 'debounce';
import { PackageManager } from 'wasi-kernel/services'
import Volume = PackageManager.Volume

import type { MountedLeanEditor } from "../publicLeanEditor";
import type { WasiProcessTransport } from "../transport/lsp-wasi-process";

import * as translation from './translation';
import * as markdown from './markdown';


class GameKeeper {
  gameData?: {
    t: (s: string) => string,
    game: any,
    worlds: {
      [worldId: string]: Level[]
    }
  }

  current: {gameId?: string, worldId: string, levelId: number} | undefined
  cursor = { /* dummy position */
    textDocument: {uri: ''},
    position: {line: 0, character: 0}
  }

  hints: HTMLDivElement
  state: any
  debouncedPoke: () => void;

  constructor(public editor: MountedLeanEditor, public transport: WasiProcessTransport) {
    this.hints = document.querySelector<HTMLDivElement>('.editor-platform-secondary-host')!;
    this.hints.closest('section')?.addEventListener('click', () => this.poke());

    this.debouncedPoke = debounce(() => this.poke(), 750);
  }

  async loadData(volume: Volume) {
    this.gameData = await readGameData(volume);
  }

  navigate(leanSource: string) {
    let mo = leanSource.match(/Runner "(.*?)" "(.*?)" (\d+)/);
    this.current = mo ? {worldId: mo[2]!, levelId: +mo[3]!} : undefined;
    this.debouncedPoke();
  }

  async rpcCall(method: string, params: any, at = this.cursor) {
    let mp = {
      method,
      params: {...params, ...at},
      ...at, 
      sessionId: this.transport.rpc.sessionId
    };
    return this.editor.session.client?.request('$/lean/rpc/call', mp);
  }


  async poke() {
    if (!this.current) return;

    let state: any = await this.rpcCall('Game.getProofState', this.current);
    this.state = state;

    let level = this.gameData?.worlds[this.current.worldId]?.[this.current.levelId - 1];

    let collected: {text: string, class?: string}[] = [];

    if (level?.introduction)
        collected.push({text: level.introduction});

    for (let step of state.steps) {
      for (let goal of step.goals ?? []) {
        for (let hint of goal.hints ?? []) {
          console.log('🤖', hint.text);
          collected.push(hint);
        }
      }
    }

    if (state.completed) {
      collected.push({text: 'Level completed. 🏆'});
    }

    let t = this.gameData?.t;

    if (collected.length > 0 && this.hints) {
      this.hints.innerText = '';
      for (let hint of collected) {
        let div = document.createElement('div');
        if (t) {
          div.append(await markdown.typesetMarkdown(t(hint.text)));
        }
        else
          div.innerText = hint.text;
        div.classList.add('game--hint', hint.class ?? 'plain');
        this.hints.append(div);
      }
    }

    if (state.completed) this.hints.scrollTo({top: 9e9});

    return state;
  }  
}

type Level = any;



async function readGameData(volume: Volume) {
    let game = JSON.parse(
        await volume.readFile('/home/.lake/gamedata/game.json', 'utf-8')
    );

    let worlds: {[worldId: string]: any[]} = {};
    for (let [worldId, numLevels] of Object.entries(game.worldSize) as [string, number][]) {
      let levels = [];
      for (let levelId = 1; levelId <= numLevels; levelId++) {
        levels.push(JSON.parse(
          await volume.readFile(`/home/.lake/gamedata/level__${worldId}__${levelId}.json`, 'utf-8')
        ));
      }
      worlds[worldId] = levels;
    }

    let en = JSON.parse(
        await volume.readFile('/home/.i18n/en/Game.json', 'utf-8')
    );

    await i18next.init({
        lng: 'en', // if you're using a language detector, do not define the lng option
        debug: true,
        resources: {
            en: {
            translation: en
            }
        }
    });

    return {
        t: translation.t(),
        game,
        worlds
    };
}


export { GameKeeper }