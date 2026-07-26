const { CompositeDisposable, Emitter } = require("atom");

describe("scrollmap-diff-view", () => {
  let editor1, editor2, mainModule, provider, layer1, layer2, service, consumerDisposable;

  // Minimal stand-in for the layer object the scrollmap hub passes to
  // `initialize` and `getItems` (see lumine-code/scrollmap lib/layer.js).
  function makeLayer(targetEditor) {
    const fake = {
      editor: targetEditor,
      cache: new Map(),
      items: [],
      disposables: new CompositeDisposable(),
    };
    fake.update = jasmine.createSpy("update").and.callFake(() => {
      const items = provider.getItems(fake);
      if (items) {
        fake.items = items;
      }
    });
    fake.updateSync = fake.update;
    fake.refresh = () => {};
    if (provider.initialize) {
      provider.initialize(fake);
    }
    return fake;
  }

  // Fake provider mirroring the object returned by the real diff-view
  // package's provideDiffService(): onDidUpdate callbacks receive
  // { chunks, editor1, editor2, addedColorSide } or null.
  function makeFakeService() {
    const emitter = new Emitter();
    return {
      emitter,
      getDiffView: () => null,
      onDidUpdate: (callback) => emitter.on("did-update-diff", callback),
    };
  }

  beforeEach(async () => {
    jasmine.attachToDOM(atom.views.getView(atom.workspace));
    const pack = await atom.packages.activatePackage("scrollmap-diff-view");
    mainModule = pack.mainModule;
    provider = mainModule.provideScrollmap();
    editor1 = await atom.workspace.open();
    editor1.setText(Array(50).fill("old text").join("\n"));
    editor2 = await atom.workspace.open();
    editor2.setText(Array(50).fill("new text").join("\n"));
    layer1 = makeLayer(editor1);
    layer2 = makeLayer(editor2);
    service = makeFakeService();
    consumerDisposable = mainModule.consumeDiffView(service);
  });

  afterEach(() => {
    consumerDisposable.dispose();
    layer1.disposables.dispose();
    layer2.disposables.dispose();
  });

  it("activates and provides a scrollmap layer descriptor", () => {
    expect(atom.packages.isPackageActive("scrollmap-diff-view")).toBe(true);
    expect(provider.name).toBe("diff-view");
    expect(typeof provider.description).toBe("string");
    expect(provider.timer).toBe(100);
    expect(provider.merge).toBe(true);
    expect(provider.threshold).toBe("scrollmap-diff-view.threshold");
    expect(typeof provider.initialize).toBe("function");
    expect(typeof provider.getItems).toBe("function");
  });

  it("marks the chunks of both diff editors with added and removed classes", () => {
    service.emitter.emit("did-update-diff", {
      chunks: [{ oldLineStart: 2, oldLineEnd: 4, newLineStart: 2, newLineEnd: 3 }],
      editor1,
      editor2,
    });
    expect(layer1.items).toEqual([{ row: 2, end: 3, cls: "added" }]);
    expect(layer2.items).toEqual([{ row: 2, end: 2, cls: "removed" }]);
  });

  it("swaps the classes when the diff puts the added color on the right", () => {
    service.emitter.emit("did-update-diff", {
      chunks: [{ oldLineStart: 2, oldLineEnd: 4, newLineStart: 2, newLineEnd: 3 }],
      editor1,
      editor2,
      addedColorSide: "right",
    });
    expect(layer1.items).toEqual([{ row: 2, end: 3, cls: "removed" }]);
    expect(layer2.items).toEqual([{ row: 2, end: 2, cls: "added" }]);
  });

  it("skips one-sided chunks on the editor they cover no lines of", () => {
    // A pure insertion: no rows in the old file, two rows in the new one.
    service.emitter.emit("did-update-diff", {
      chunks: [{ oldLineStart: 5, oldLineEnd: 5, newLineStart: 5, newLineEnd: 7 }],
      editor1,
      editor2,
    });
    expect(layer1.items).toEqual([]);
    expect(layer2.items).toEqual([{ row: 5, end: 6, cls: "removed" }]);
  });

  it("returns one raw item per two-sided chunk and leaves merging to the hub", () => {
    service.emitter.emit("did-update-diff", {
      chunks: [
        { oldLineStart: 2, oldLineEnd: 4, newLineStart: 2, newLineEnd: 4 },
        { oldLineStart: 4, oldLineEnd: 7, newLineStart: 4, newLineEnd: 7 },
      ],
      editor1,
      editor2,
    });
    expect(layer1.items).toEqual([
      { row: 2, end: 3, cls: "added" },
      { row: 4, end: 6, cls: "added" },
    ]);
  });

  it("clears the previous editors when the diff view is closed", () => {
    service.emitter.emit("did-update-diff", {
      chunks: [{ oldLineStart: 2, oldLineEnd: 4, newLineStart: 2, newLineEnd: 4 }],
      editor1,
      editor2,
    });
    expect(layer1.items.length).toBe(1);
    expect(layer2.items.length).toBe(1);

    service.emitter.emit("did-update-diff", null);
    expect(layer1.items).toEqual([]);
    expect(layer2.items).toEqual([]);
  });

  it("clears the layers when the consumer is disposed", () => {
    service.emitter.emit("did-update-diff", {
      chunks: [{ oldLineStart: 2, oldLineEnd: 4, newLineStart: 2, newLineEnd: 4 }],
      editor1,
      editor2,
    });
    expect(layer1.items.length).toBe(1);

    consumerDisposable.dispose();
    expect(layer1.items).toEqual([]);
    expect(layer2.items).toEqual([]);
    expect(mainModule.diffService).toBeNull();

    layer1.update.calls.reset();
    service.emitter.emit("did-update-diff", {
      chunks: [{ oldLineStart: 2, oldLineEnd: 4, newLineStart: 2, newLineEnd: 4 }],
      editor1,
      editor2,
    });
    expect(layer1.update).not.toHaveBeenCalled();
  });
});
