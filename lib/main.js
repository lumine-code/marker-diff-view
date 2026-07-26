const { Disposable } = require("atom");

module.exports = {
  activate() {
    this.diffService = null;
    this.lastEditor1 = null;
    this.lastEditor2 = null;
    // Layers handed over by the scrollmap hub, keyed by editor.
    this.layers = new Map();
  },

  deactivate() {
    this.diffService = null;
    this.layers.clear();
  },

  clearLayer(editor) {
    const layer = editor ? this.layers.get(editor) : null;
    if (layer) {
      layer.cache.set("data", null);
      layer.updateSync();
    }
  },

  setLayerData(editor, data) {
    const layer = editor ? this.layers.get(editor) : null;
    if (layer) {
      layer.cache.set("data", data);
      layer.updateSync();
    }
  },

  consumeDiffView(diffService) {
    this.diffService = diffService;
    let subscription = diffService.onDidUpdate?.((data) => {
      const { chunks, editor1, editor2 } = data || {};
      if (this.lastEditor1 && this.lastEditor1 !== editor1) {
        this.clearLayer(this.lastEditor1);
      }
      if (this.lastEditor2 && this.lastEditor2 !== editor2) {
        this.clearLayer(this.lastEditor2);
      }
      this.lastEditor1 = editor1;
      this.lastEditor2 = editor2;
      // The added color follows the diff-view addedColorSide setting; the
      // removed color lands on the opposite editor.
      const addedSide = data?.addedColorSide === "right" ? "right" : "left";
      this.setLayerData(
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
      this.setLayerData(
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
      this.clearLayer(this.lastEditor1);
      this.clearLayer(this.lastEditor2);
      this.lastEditor1 = null;
      this.lastEditor2 = null;
      this.diffService = null;
      subscription?.dispose();
    });
  },

  provideScrollmapLayer() {
    return {
      name: "diff-view",
      description: "Diff-view chunk markers",
      timer: 100,
      merge: true,
      threshold: "scrollmap-diff-view.threshold",
      initialize: (layer) => {
        this.layers.set(layer.editor, layer);
        layer.disposables.add(new Disposable(() => this.layers.delete(layer.editor)));
      },
      getItems: ({ editor, cache }) => {
        const data = cache.get("data");
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
