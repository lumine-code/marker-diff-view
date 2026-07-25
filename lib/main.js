const { CompositeDisposable, Disposable } = require("atom");

module.exports = {
  activate() {
    this.disposables = new CompositeDisposable(
      atom.config.observe("scrollmap-diff-view.threshold", (value) => {
        this.threshold = value;
      }),
    );
    this.diffService = null;
    this.lastEditor1 = null;
    this.lastEditor2 = null;
    // Layers handed over by the scrollmap hub, keyed by editor.
    this.layers = new Map();
  },

  deactivate() {
    this.diffService = null;
    this.layers.clear();
    this.disposables.dispose();
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

  consumeDiffService(diffService) {
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
      this.setLayerData(
        editor1,
        chunks ? { chunks, startKey: "oldLineStart", endKey: "oldLineEnd", cls: "added" } : null,
      );
      this.setLayerData(
        editor2,
        chunks ? { chunks, startKey: "newLineStart", endKey: "newLineEnd", cls: "removed" } : null,
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

  provideScrollmap() {
    return {
      name: "diff",
      description: "Diff-view chunk markers",
      timer: 100,
      initialize: (layer) => {
        this.layers.set(layer.editor, layer);
        layer.disposables.add(
          new Disposable(() => this.layers.delete(layer.editor)),
          atom.config.onDidChange("scrollmap-diff-view.threshold", layer.update),
        );
      },
      getItems: ({ editor, cache }) => {
        const data = cache.get("data");
        if (!data) {
          return [];
        }
        const { chunks, startKey, endKey, cls } = data;
        const items = [];
        let lastItem = null;
        for (const chunk of chunks) {
          const startRow = editor.screenRowForBufferRow(chunk[startKey]);
          const endRow = editor.screenRowForBufferRow(chunk[endKey] - 1);
          if (lastItem && startRow <= (lastItem.end ?? lastItem.row) + 1) {
            lastItem.end = endRow;
          } else {
            if (lastItem) items.push(lastItem);
            lastItem = { row: startRow, end: endRow, cls };
          }
        }
        if (lastItem) items.push(lastItem);
        if (this.threshold && items.length > this.threshold) {
          return [];
        }
        return items;
      },
    };
  },
};
