import { createHash } from "https://deno.land/std@0.108.0/hash/mod.ts";
import { ensureDir } from "https://deno.land/std@0.108.0/fs/ensure_dir.ts";
import { walk } from "https://deno.land/std@0.108.0/fs/walk.ts";
import { exists } from "https://deno.land/std@0.108.0/fs/exists.ts";
import { resolve } from "https://deno.land/std@0.108.0/path/posix.ts";
import { parse as parseArgs } from "https://deno.land/std@0.108.0/flags/mod.ts";

/*
 * Deno cache injector
 * cache algorithm is referenced from Deno source
 * https://github.com/denoland/deno/blob/main/cli/disk_cache.rs
 * https://github.com/denoland/deno/blob/main/cli/deno_dir.rs
 *
 * License is the same as Deno: MIT
 * https://github.com/denoland/deno/blob/main/LICENSE.md
 */

type ScriptLocation = {
  protocol: string;
  host: string;
  port?: string;
  rest: string;
};

type Option = {
  delete: boolean;
  useSymlink: boolean;
  verbose: boolean;
};

function parseURL(url: string): ScriptLocation {
  const parsed = url.match(/(\w+):\/\/([^:\/]+)(?::(\d+))?(.*)/);
  if (!parsed) {
    throw new Error(`Malformed URL '${url}'`);
  }
  return {
    protocol: parsed[1],
    host: parsed[2],
    port: parsed[3],
    rest: parsed[4],
  };
}

export async function getDenoDir() {
  await Deno.permissions.request({ name: "env" });
  const denoDir = Deno.env.get("DENO_DIR");
  if (denoDir) {
    return denoDir;
  }
  switch (Deno.build.os) {
    case "linux":
      return (Deno.env.get("XDG_CACHE_HOME") ??
        Deno.env.get("HOME") + "/.cache") + "/deno";
    case "darwin":
      return Deno.env.get("HOME") + "/Library/Caches/deno";
  }
}

async function process(target: string, prefix: string, option: Option) {
  const depsDir = (await getDenoDir()) + "/deps";

  await Deno.permissions.request({ name: "read" });
  await Deno.permissions.request({ name: "write" });

  Deno.chdir(target);
  for await (const e of walk(".")) {
    if (!e.isFile || !(e.path.endsWith("js") || e.path.endsWith("ts"))) {
      continue;
    }

    const url = prefix + "/" + e.path;
    const loc = parseURL(url);
    const host = loc.host + (loc.port ? "_PORT" + loc.port : "");
    const dir = `${depsDir}/${loc.protocol}/${host}`;
    await ensureDir(dir);

    const hasher = createHash("sha256");
    hasher.update(loc.rest);

    const fromPath = resolve(e.path);
    const destPath = `${dir}/${hasher}`;

    if (await exists(destPath)) {
      await Deno.remove(destPath);
      if (option.verbose) {
        console.log(`delete: ${destPath}`);
      }
    }
    if (option.delete) {
      return;
    }
    if (option.useSymlink) {
      await Deno.symlink(fromPath, destPath);
    } else {
      await Deno.copyFile(e.path, destPath);
    }
    if (option.verbose) {
      console.log(
        `${option.useSymlink ? "link" : "copy"}: ${fromPath} => ${destPath}`,
      );
    }

    const mpath = destPath + ".metadata.json";
    await Deno.writeTextFile(
      mpath,
      JSON.stringify({
        headers: {},
        url,
      }),
    );
  }
}

async function main(args: string[]): Promise<number> {
  const parsed = parseArgs(args, {
    boolean: ["d", "s", "v"],
  });
  if (parsed._.length !== 2) {
    const scriptName = import.meta.url.replace(/.*\//, "");
    console.log("deno cache injector");
    console.log(
      "Replace JavaScript/TypeScript files in the cache to files in the particular directory",
    );
    console.log("");
    console.log("To use files in <libpath> for <liburl>:");
    console.log("");
    console.log(
      `  deno run ${scriptName} ./denops-std-deno https://deno.land/x/denops_std@v2.0.0`,
    );
    console.log("");
    console.log("USAGE:");
    console.log(`  deno run ${scriptName} <option>... <libpath> <liburl>`);
    console.log("");
    console.log("OPTIONS:");
    console.log(
      "  -d           Delete cache (Only files that exists in <libpath>)",
    );
    console.log("  -s           Use symbolic link");
    console.log("  -v           Display verbose log");
    console.log("");
    console.log("ARGUMENTS:");
    console.log(
      "  <libpath>    A local directory path which is used to replace the cache",
    );
    console.log(
      "  <liburl>     A base URL of a library in the cache to replace",
    );
    console.log("");
    console.log("PERMISSIONS:");
    console.log("  --allow-env");
    console.log("  --allow-read");
    console.log("  --allow-write");
    console.log("");
    return 1;
  }
  const target = parsed._[0].toString();
  const prefix = parsed._[1].toString();
  const option = {
    delete: parsed.d,
    useSymlink: parsed.s,
    verbose: parsed.v,
  };
  await process(target, prefix, option);
  console.log(
    `All JavaScript/TypeScript files for ${prefix} in the cache are replaced to files in ${target}`,
  );
  return 0;
}

if (import.meta.main) {
  Deno.exit(await main(Deno.args));
}
