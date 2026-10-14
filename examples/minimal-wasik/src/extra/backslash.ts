import { EditorView } from "@codemirror/view"
import { Extension } from "@codemirror/state"

const replacements: Record<string, string> = {
  '1': "₁", '2': "₂", '3': "₃", '4': "₄", '5': "₅", '.': "·",
  'l': "←", 'r': "→", '<': "⟨", '>': "⟩",
  'a': "α", 'b': "β"
}

export default function backslashReplace(): Extension {
  return EditorView.inputHandler.of((view, from, to, text) => {
    const replacement = replacements[text]
    if (!replacement || from !== to || from === 0) return false
    if (view.state.doc.sliceString(from - 1, from) !== "\\") return false
    view.dispatch({
      changes: {from: from - 1, to, insert: replacement},
      selection: {anchor: from - 1 + replacement.length},
      userEvent: "input.type",
    })
    return true
  })
}