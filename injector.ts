import { createHash } from "https://deno.land/std@0.95.0/hash/mod.ts";
import { ensureDir } from "https://deno.land/std@0.95.0/fs/ensure_dir.ts";
import { walk } from "https://deno.land/std@0.95.0/fs/walk.ts";

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

async function getCacheDir() {
  await Deno.permissions.request({ name: "env" });
  switch (Deno.build.os) {
    case "linux":
      return Deno.env.get("XDG_CACHE_HOME") ??
        Deno.env.get("HOME") + "/.cache";
    case "darwin":
      return Deno.env.get("HOME") + "/Library/Caches";
  }
}

async function process(target: string, prefix: string) {
  const depsDir = await getCacheDir() + "/deno/deps";

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
    const path = `${dir}/${hasher}`;
    await Deno.copyFile(e.path, path);
    const mpath = path + ".metadata.json";
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
  if (args.length !== 2) {
    const scriptName = import.meta.url.replace(/.*\//, "");
    console.log("deno cache injector");
    console.log(
      "Replace JavaScript/TypeScript files in the cache to files in the particular directory",
    );
    console.log("");
    console.log("To use files in <libpath> for <liburl>:");
    console.log("");
    console.log(
      `  deno run ${scriptName} ./denops-std-deno https://deno.land/x/denops_std@v0.10`,
    );
    console.log("");
    console.log("USAGE:");
    console.log(`  deno run ${scriptName} <libpath> <liburl>`);
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
  const target = args[0];
  const prefix = args[1];
  await process(target, prefix);
  console.log(`All JavaScript/TypeScript files for ${prefix} in the cache are replaced to files in ${target}`);
  return 0;
}

Deno.exit(await main(Deno.args));
