This script will replace JavaScript/TypeScript files in the cache to files in
the particular directory.

# Install

`$ deno install -n deno-cache-injector --allow-env --allow-read --allow-write https://deno.land/x/cache_injector@1.0.0/injector.ts`

# Permissions

Here's an overview of how deno-cache-injector uses permissions:

| Permission | Description                            |
| ---------- | -------------------------------------- |
| `env`      | Access to $HOME for resolve cache path |
| `read`     | Read `<libpath>`                       |
| `write`    | Write cache                            |

# Usage

`deno-cache-injector <option>... <libpath> <liburl>`

### Options

| Option | Description                                         |
| ------ | --------------------------------------------------- |
| -d     | Delete cache (Only files that exists in `<libpath>` |
| -s     | Use symbolic link                                   |
| -v     | Display verbose log                                 |

### Arguments

| Argument    | Description                                               |
| ----------- | --------------------------------------------------------- |
| `<libpath>` | A local directory path which is used to replace the cache |
| `<liburl>`  | A base URL of a library in the cache to replace           |

### Example

`deno-cache-injector ./denops-std-deno https://deno.land/x/denops_std@v0.10`

or

`deno-cache-injector -s ./denops-std-deno https://deno.land/x/denops_std@v0.10`

# License

This project is licensed under the MIT License. See [LICENSE](LICENSE.txt) for
details.
