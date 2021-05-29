import { createHash } from "https://deno.land/std@0.95.0/hash/mod.ts";
import { ensureDirSync } from "https://deno.land/std@0.95.0/fs/ensure_dir.ts";
import { walkSync } from "https://deno.land/std@0.95.0/fs/walk.ts";

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
  port: string | undefined;
  rest: string;
};

if (Deno.args.length !== 2) {
  const scriptName = import.meta.url.replace(/.*\//, "");
  console.log(
    `Usage: deno run --allow-env --allow-read --allow-write ${scriptName} <library path> <url prefix>`,
  );
  console.log("Example:");
  console.log("\tlibrary path: deno_std");
  console.log("\turl prefix: https://deno.land/std@0.95.0");
  Deno.exit(1);
}

const parseURL = (url: string): ScriptLocation => {
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
};

const denoDir = () => {
  switch (Deno.build.os) {
    case "linux":
      return Deno.env.get("XDG_CACHE_HOME") ??
        Deno.env.get("HOME") + "/.cache";
    case "darwin":
      return Deno.env.get("HOME") + "/Library/Cache";
  }
};

const depsDir = denoDir() + "/deno/deps";

const process = (target: string, prefix: string) => {
  Deno.chdir(target);
  for (const e of walkSync(".")) {
    if (!e.isFile || !(e.path.endsWith("js") || e.path.endsWith("ts"))) {
      continue;
    }

    const url = prefix + "/" + e.path;
    const loc = parseURL(url);
    const host = loc.host + (loc.port ? "_PORT" + loc.port : "");
    const dir = `${depsDir}/${loc.protocol}/${host}`;
    ensureDirSync(dir);

    const hasher = createHash("sha256");
    hasher.update(loc.rest);
    const path = `${dir}/${hasher}`;
    Deno.copyFileSync(e.path, path);
    const mpath = path + ".metadata.json";
    Deno.writeTextFileSync(
      mpath,
      JSON.stringify({
        headers: {},
        url,
      }),
    );
  }
};

process(Deno.args[0], Deno.args[1]);
