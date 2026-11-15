# T3 Code themes

Each folder is one theme. `gen.py` builds the theme and writes `theme.json` next to it.
The folder name becomes the theme id.

| Theme | What it is |
| --- | --- |
| `tokyo-night-pixel` | Tokyo Night colors with an animated pixel-art Tokyo skyline behind the chat, a matching sidebar and right panel, and pink neon highlights. |

## Install on a machine

```sh
~/dotfiles/t3code/install.sh
```

Then select the theme in T3 Code's settings, or ask an agent in T3 Code to switch to
`tokyo-night-pixel`. You select it only once per machine. Later installs update it in place.

The script copies each theme into `~/.t3/userdata/themes/`. It copies rather than links
because T3 Code refuses theme files that are symlinks. Set `T3_THEMES_DIR` to install
somewhere else.

`scripts/installation.sh` does not run this, because that installer only creates symlinks.

## Change a theme

1. Edit `tokyo-night-pixel/gen.py`.
2. Rebuild: `python3 tokyo-night-pixel/gen.py`. Add `--preview` to also write
   `preview.html`, which shows only the skyline scene in a browser.
3. Run `./install.sh`. T3 Code applies the change within a second.
4. Commit `gen.py` and `theme.json` together.

The build fails if the CSS is over 20,000 characters, the most T3 Code accepts. The
skyline is random but uses a fixed seed, so each build produces the same scene.

If an agent changes the theme from inside T3 Code, it writes only to
`~/.t3/userdata/themes/`, not to this folder. Make the same change in `gen.py`, or the
next `./install.sh` will undo it.

Most selectors in the CSS are on T3 Code's stable list. These are not, so they may stop
matching after a T3 Code update:

- `[data-workspace-area=panel]`
- `[data-right-panel-tabbar]` and `[data-active-tab]`
- `[data-slot=sidebar-footer]`
- `[data-thread-queue] .border-dashed`
- `[data-timeline-loading]`
- `[data-subagent-group]`
