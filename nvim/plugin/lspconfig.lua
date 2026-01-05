-- if not lsp then return end

local protocol = require("vim.lsp.protocol")

local augroup_format = vim.api.nvim_create_augroup("Format", { clear = true })

-- local enable_format_on_save = function(_, bufnr)
--     vim.api.nvim_clear_autocmds({ group = augroup_format, buffer = bufnr })
--     vim.api.nvim_create_autocmd("BufWritePre", {
--         group = augroup_format,
--         buffer = bufnr,
--         callback = function()
--             vim.lsp.buf.format({ bufnr = bufnr })
--         end,
--     })
-- end

-- Use an on_attach function to only map the following keys
-- after the language server attaches to the current buffer
local on_attach = function(client, bufnr)
    local function buf_set_option(...)
        vim.api.nvim_buf_set_option(bufnr, ...)
    end

    -- for LSP related items. It sets the mode, buffer and description for us each time.
    local nmap = function(keys, func, desc)
        if desc then
            desc = "LSP: " .. desc
        end

        vim.keymap.set("n", keys, func, { buffer = bufnr, desc = desc })
    end

    --Enable completion triggered by <c-x><c-o>
    buf_set_option("omnifunc", "v:lua.vim.lsp.omnifunc")

    -- Mappings.
    nmap("<leader>rn", vim.lsp.buf.rename, "[R]e[n]ame")
    nmap("<leader>ca", vim.lsp.buf.code_action, "[C]ode [A]ction")

    nmap("gd", vim.lsp.buf.definition, "[G]oto [D]efinition")
    nmap("gr", require("telescope.builtin").lsp_references, "[G]oto [R]eferences")
    nmap("gi", require("telescope.builtin").lsp_implementations, "[G]oto [I]mplementation")
    nmap("<leader>D", vim.lsp.buf.type_definition, "Type [D]efinition")
    nmap("<leader>ds", require("telescope.builtin").lsp_document_symbols, "[D]ocument [S]ymbols")
    nmap("<leader>ws", require("telescope.builtin").lsp_dynamic_workspace_symbols, "[W]orkspace [S]ymbols")

    -- See `:help K` for why this keymap
    nmap("K", vim.lsp.buf.hover, "Hover Documentation")
    nmap("<C-k>", vim.lsp.buf.signature_help, "Signature Documentation")

    -- Lesser used LSP functionality
    nmap("gD", vim.lsp.buf.declaration, "[G]oto [D]eclaration")
    nmap("<leader>wa", vim.lsp.buf.add_workspace_folder, "[W]orkspace [A]dd Folder")
    nmap("<leader>wr", vim.lsp.buf.remove_workspace_folder, "[W]orkspace [R]emove Folder")
    nmap("<leader>wl", function()
        print(vim.inspect(vim.lsp.buf.list_workspace_folders()))
    end, "[W]orkspace [L]ist Folders")

    -- Show line diagnostics automatically in hover window
    vim.api.nvim_create_autocmd("CursorHold", {
        buffer = bufnr,
        callback = function()
            local opts = {
                focusable = false,
                close_events = { "BufLeave", "CursorMoved", "InsertEnter", "FocusLost" },
                border = "rounded",
                source = "always",
                prefix = " ",
                scope = "cursor",
            }
            vim.diagnostic.open_float(nil, opts)
        end,
    })

    -- Create a command `:Format` local to the LSP buffer
    vim.api.nvim_buf_create_user_command(bufnr, "Format", function(_)
        if vim.lsp.buf.format then
            vim.lsp.buf.format()
        elseif vim.lsp.buf.formatting then
            vim.lsp.buf.formatting()
        end
    end, { desc = "Format current buffer with LSP" })
end

protocol.CompletionItemKind = {
    "", -- Text
    "", -- Method
    "", -- Function
    "", -- Constructor
    "", -- Field
    "", -- Variable
    "", -- Class
    "ﰮ", -- Interface
    "", -- Module
    "", -- Property
    "", -- Unit
    "", -- Value
    "", -- Enum
    "", -- Keyword
    "﬌", -- Snippet
    "", -- Color
    "", -- File
    "", -- Reference
    "", -- Folder
    "", -- EnumMember
    "", -- Constant
    "", -- Struct
    "", -- Event
    "ﬦ", -- Operator
    "", -- TypeParameter
}

-- Set up completion using nvim_cmp with LSP source
local capabilities = require("cmp_nvim_lsp").default_capabilities(vim.lsp.protocol.make_client_capabilities())

-- Turn on lsp status information
require("fidget").setup()

vim.lsp.config["flow"] = {
    on_attach = on_attach,
    capabilities = capabilities,
}
vim.lsp.enable("flow")

-- typescript
vim.lsp.config["ts_ls"] = {
    on_attach = function(client, bufnr)
        on_attach(client, bufnr)
    end,
    filetypes = { "javascript", "javascriptreact", "javascript.jsx", "typescript", "typescriptreact", "typescript.tsx" },
    cmd = { "typescript-language-server", "--stdio" },
}
vim.lsp.enable("ts_ls")

-- lua
vim.lsp.enable("neodev")
vim.lsp.config["lua_ls"] = {
    on_attach = function(client, bufnr)
        on_attach(client, bufnr)
    end,
    settings = {
        Lua = {
            diagnostics = {
                -- Get the language server to recognize the `vim` global
                globals = { "vim" },
            },
            workspace = {
                -- Make the server aware of Neovim runtime files
                library = vim.api.nvim_get_runtime_file("", true),
                checkThirdParty = false,
            },
        },
    },
}
vim.lsp.enable("lua_ls")
-- go
-- go import
function go_org_imports(wait_ms)
    local params = {
        textDocument = vim.lsp.util.make_text_document_params(0),
        context = { only = { "source.organizeImports" } },
    }
    local result = vim.lsp.buf_request_sync(0, "textDocument/codeAction", params, wait_ms)
    for cid, res in pairs(result or {}) do
        for _, r in pairs(res.result or {}) do
            if r.edit then
                local client = vim.lsp.get_client_by_id(cid)
                local client_enc = client and client.offset_encoding or "utf-16"
                vim.lsp.util.apply_workspace_edit(r.edit, client_enc)
            end
        end
    end
end

-- Function to determine the root directory
local function get_root_dir(fname)
    local patterns = {
        ".*/gophers/go/dispatcher/grab%-id/.-/",
        ".*/gophers/go/grab%-id/.-/",
    }

    for _, pattern in ipairs(patterns) do
        local root = fname:match(pattern)
        if root then
            return root
        end
    end

    return util.root_pattern("go.mod", ".git", "go.work", "doc.go", "grabkit.yml")(fname)
end

local gopls_env = {
    GOPROXY = "goproxy.myteksi.net|proxy.golang.org,direct",
    GONOSUMDB = "gitlab.myteksi.net",
    GONOPROXY = "none",
    GOPRIVATE = "gitlab.myteksi.net/gophers/go/*",
    GO111MODULE = "on",
}

-- Only use custom grab driver while working on go monorepo
-- local cwd = vim.loop.cwd() or ""
-- if cwd:find("^/Users/jeffrey%.lean/gopath/src/gitlab%.myteksi%.net/gophers/go") then
--     gopls_env.GOPACKAGESDRIVER = "grabpackages"
-- end
--
vim.lsp.config["gopls"] = {
    cmd = { "gopls", "-v", "-rpc.trace", "serve", "--debug=localhost:6060" },
    filetypes = { "go", "gomod", "gowork" },
    --root_dir = get_root_dir,
    settings = {
        gopls = {
            --allExperiments = true,
            env = gopls_env,
            directoryFilters = {
                "-vendor",
                "-node_modules",
                "-geo/poi-collector/scripts",
                "-geo/poi-cronjob/scripts",
                "-testdata",
                "+dispatcher/grab-id/**",
                "+grab-id/**",
                "+commons/**",
            },
            gofumpt = true,
            completeUnimported = true,
            staticcheck = false,
            usePlaceholders = true,
            semanticTokens = true,
            --codelenses = {
            --    generate = true,
            --    test = true,
            --},
            matcher = "fuzzy",
            symbolMatcher = "fuzzy",
            analyses = {
                printf = true,
                fillreturns = true,
                nonewvars = true,
                undeclaredname = true,
                unusedparams = true,
                unreachable = true,
                ifaceassert = true,
                nilness = true,
                shadow = true,
                unusedwrite = true,
            },
            --deepCompletion = true,
            expandWorkspaceToModule = false,
            --verboseOutput = true,
        },
    },
    on_attach = function(client, bufnr)
        on_attach(client, bufnr)
        vim.api.nvim_create_autocmd("BufWritePre", {
            pattern = "*.go",
            callback = function()
                go_org_imports()
            end,
        })
    end,
}
vim.lsp.enable("gopls")

-- rust
-- Configure LSP through rust-tools.nvim plugin.
-- rust-tools will configure and enable certain LSP features for us.
-- See https://github.com/simrat39/rust-tools.nvim#configuration
vim.lsp.config["rust-tools"] = {
    tools = {
        runnables = {
            use_telescope = true,
        },
        inlay_hints = {
            auto = true,
            show_parameter_hints = false,
            parameter_hints_prefix = "",
            other_hints_prefix = "",
        },
    },
    -- all the opts to send to nvim-lspconfig
    -- these override the defaults set by rust-tools.nvim
    -- see https://github.com/neovim/nvim-lspconfig/blob/master/CONFIG.md#rust_analyzer
    server = {
        on_attach = function(client, bufnr)
            on_attach(client, bufnr)
        end,
        settings = {
            -- to enable rust-analyzer settings visit:
            -- https://github.com/rust-analyzer/rust-analyzer/blob/master/docs/user/generated_config.adoc
            ["rust-analyzer"] = {
                -- enable clippy on save
                checkOnSave = {
                    command = "clippy",
                },
                -- disable proc macro diagnostics, the error message is too irritating.
                diagnostics = {
                    disabled = { "unresolved-proc-macro" },
                },
            },
        },
    },
}
vim.lsp.enable("rust-tools")

-- This autocmd runs the organize imports code action for Python files
vim.api.nvim_create_autocmd("BufWritePre", {
    pattern = "*.py",
    callback = function()
        vim.lsp.buf.code_action({
            context = {
                only = { "source.organizeImports" },
            },
            apply = true,
        })
    end,
})

-- python
vim.lsp.config["pyright"] = {
    settings = {
        pyright = {
            -- Using Ruff's import organizer
            disableOrganizeImports = true,
        },
        python = {
            analysis = {
                -- Ignore all files for analysis to exclusively use Ruff for linting
                ignore = { "*" },
            },
        },
    },
    on_attach = function(client, bufnr)
        on_attach(client, bufnr)
    end,
}
vim.lsp.enable("pyright")

vim.lsp.config["ruff"] = {
    on_attach = function(client, bufnr)
        if client.name == "ruff" then
            client.server_capabilities.hoverProvider = false
        end
    end,
}
vim.lsp.enable("ruff")

-- Sourcegraph configuration. All keys are optional
--require("sg").setup {
--    on_attach = function(client, bufnr)
--        on_attach(client, bufnr)
--    end,
--}

-- disable virtual text
--vim.lsp.handlers["textDocument/publishDiagnostics"] = vim.lsp.with(
--    vim.lsp.diagnostic.on_publish_diagnostics, {
--    virtual_text = false,
--    signs = true,
--    update_in_insert = true,
--}
--)
