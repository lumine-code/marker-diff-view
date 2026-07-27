# marker-diff-view

Show diff chunks on the scrollbar and minimap.

A marker layer drawn by [scrollmap](https://github.com/lumine-code/scrollmap) and [minimap](https://github.com/lumine-code/minimap). Requires [diff-view](https://github.com/lumine-code/diff-view).

## Features

- **Diff markers**: shows diff chunks of both compared editors on the scrollbar and minimap.
- **Added and removed**: chunks are styled separately for each side of the diff, following the diff-view added-color side setting.
- **Range merging**: adjacent chunk rows are merged into a single marker.
- **Threshold**: hides markers when the chunk count exceeds a configurable limit.

## Installation

To install `marker-diff-view` search for _marker-diff-view_ in the Install pane of the Lumine settings or run `lumine --install lumine-code/marker-diff-view`.

## Customization

The marker style can be adjusted in the `styles.less` file, e.g. change the marker colors:

```less
.marker.marker-diff-view {
  &.added {
    background-color: var(--text-color-info);
  }
  &.removed {
    background-color: var(--text-color-warning);
  }
}
```

## Services

- **[marker.layer](https://lumine-code.github.io/docs.html#services/marker.layer)** (`1.0.0`): provided to render diff chunk markers as a layer on the editor's overview maps.
- **[diff-view](https://lumine-code.github.io/docs.html#services/diff-view)** (`^1.0.0`): consumed to observe diff updates and read the chunks of the compared editors.

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub. Any feedback is welcome!
