const { Disposable } = require("atom");

module.exports = {
  activate() {
    this.diffService = null;
    this.lastEditor1 = null;
    this.lastEditor2 = null;
    // Every renderer builds its own layer from the descriptor, so an editor maps
    // to a set of layers rather than one.
    this.layers = new Map();
    // The chunks behind those layers, resolved once per editor and read by all
    // of them: a layer that attaches while a diff is already running has to draw
    // it without waiting for the next update.
    this.data = new Map();
  },

  deactivate() {
    this.diffService = null;
    this.layers.clear();
    this.data.clear();
  },

  setEditorData(editor, data) {
    if (!editor) {
      return;
    }
    if (data) {
      this.data.set(editor, data);
    } else {
      this.data.delete(editor);
    }
    // Sync rather than throttled: the handover when the diff swaps editors has
    // to land in one frame or the old markers flicker through.
    for (const layer of this.layers.get(editor) ?? []) {
      layer.updateSync();
    }
  },

  consumeDiffView(diffService) {
    this.diffService = diffService;
    let subscription = diffService.onDidUpdate?.((data) => {
      const { chunks, editor1, editor2 } = data || {};
      if (this.lastEditor1 && this.lastEditor1 !== editor1) {
        this.setEditorData(this.lastEditor1, null);
      }
      if (this.lastEditor2 && this.lastEditor2 !== editor2) {
        this.setEditorData(this.lastEditor2, null);
      }
      this.lastEditor1 = editor1;
      this.lastEditor2 = editor2;
      // The added color follows the diff-view addedColorSide setting; the
      // removed color lands on the opposite editor.
      const addedSide = data?.addedColorSide === "right" ? "right" : "left";
      this.setEditorData(
        editor1,
        chunks
          ? {
              chunks,
              startKey: "oldLineStart",
              endKey: "oldLineEnd",
              cls: addedSide === "left" ? "added" : "removed",
            }
          : null,
      );
      this.setEditorData(
        editor2,
        chunks
          ? {
              chunks,
              startKey: "newLineStart",
              endKey: "newLineEnd",
              cls: addedSide === "left" ? "removed" : "added",
            }
          : null,
      );
    });
    return new Disposable(() => {
      this.setEditorData(this.lastEditor1, null);
      this.setEditorData(this.lastEditor2, null);
      this.lastEditor1 = null;
      this.lastEditor2 = null;
      this.diffService = null;
      subscription?.dispose();
    });
  },

  provideMarkerLayer() {
    return {
      name: "diff-view",
      description: "Diff-view chunk markers",
      timer: 100,
      merge: true,
      threshold: "marker-diff-view.threshold",
      initialize: (layer) => {
        let layers = this.layers.get(layer.editor);
        if (!layers) {
          layers = new Set();
          this.layers.set(layer.editor, layers);
        }
        layers.add(layer);
        layer.disposables.add(
          new Disposable(() => {
            layers.delete(layer);
            if (layers.size === 0) {
              this.layers.delete(layer.editor);
              this.data.delete(layer.editor);
            }
          }),
        );
      },
      getItems: ({ editor }) => {
        const data = this.data.get(editor);
        if (!data) {
          return [];
        }
        const { chunks, startKey, endKey, cls } = data;
        const items = [];
        for (const chunk of chunks) {
          const start = chunk[startKey];
          const end = chunk[endKey];
          // A one-sided chunk covers no lines on this editor: a pure
          // insertion has no rows in the old file and vice versa.
          if (start === end) {
            continue;
          }
          items.push({
            row: editor.screenRowForBufferRow(start),
            end: editor.screenRowForBufferRow(end - 1),
            cls,
          });
        }
        return items;
      },
    };
  },
};
