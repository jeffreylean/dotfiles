-- Pull in the wezterm API
local wezterm = require 'wezterm'

-- This table will hold the configuration.
local config = {}

-- In newer versions of wezterm, use the config_builder which will
-- help provide clearer error messages
if wezterm.config_builder then
    config = wezterm.config_builder()
end

-- This is where you actually apply your config choices

-- For example, changing the color scheme:
config.color_scheme = 'tokyonight_storm'
--config.window_background_opacity = 0.95

-- Font size
config.font_size = 15.5

-- Disable dead key, because Vi need `^` single keypress
config.use_dead_keys = false
config.debug_key_events = true

config.keys = {
    -- Turn off the default SHIFT-CTRL-^ Hide action, allowing CMD-SHIFT-^ to
    -- be potentially recognized and handled by vim
    {
        key = '^',
        mods = 'SHIFT|CTRL',
        action = wezterm.action.DisableDefaultAssignment,
    },
}

config.adjust_window_size_when_changing_font_size = false


-- and finally, return the configuration to wezterm
return config
