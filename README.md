# scrollmap-diff-view

Show diff chunks on the scrollbar.

A layer package for [scrollmap](https://github.com/lumine-code/scrollmap). Requires [diff-view](https://github.com/lumine-code/diff-view).

## Features

- **Diff markers**: shows diff chunks of both compared editors on the scrollbar.
- **Added and removed**: chunks are styled separately for each side of the diff, following the diff-view added-color side setting.
- **Range merging**: adjacent chunk rows are merged into a single marker.
- **Threshold**: hides markers when the chunk count exceeds a configurable limit.

## Installation

To install `scrollmap-diff-view` search for _scrollmap-diff-view_ in the Install pane of the Lumine settings or run `lumine --install lumine-code/scrollmap-diff-view`.

## Customization

The marker style can be adjusted in the `styles.less` file, e.g. change the marker colors:

```less
.scrollmap .marker.marker-diff-view {
  &.added {
    background-color: var(--text-color-info);
  }
  &.removed {
    background-color: var(--text-color-warning);
  }
}
```

## Services

- **scrollmap.layer** (`1.0.0`): provided to render diff chunk markers as a layer on the editor scrollbar.
- **diff-view** (`^1.0.0`): consumed to observe diff updates and read the chunks of the compared editors.

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub. Any feedback is welcome!
