import { getDenoDir } from "./injector.ts";
import { assertEquals } from "https://deno.land/std@0.108.0/testing/asserts.ts";

const os = Deno.build.os;

Deno.env.delete("DENO_DIR");
Deno.env.set("HOME", "testhome");
Deno.env.set("LOCALAPPDATA", "testhome");
Deno.env.delete("XDG_CACHE_HOME");

Deno.test({
  name: "hoge",
  ignore: os !== "linux" && os !== "darwin" && os !== "windows",
  async fn() {
    if (os === "linux") {
      assertEquals(await getDenoDir(), "testhome/.cache/deno");
      Deno.env.set("XDG_CACHE_HOME", "testcachehome");
      assertEquals(await getDenoDir(), "testcachehome/deno");
    } else if (os === "darwin") {
      assertEquals(await getDenoDir(), "testhome/Library/Caches/deno");
    } else if (os === "windows") {
      assertEquals(await getDenoDir(), "testhome/deno");
    }
    Deno.env.set("DENO_DIR", "testdenodir");
    assertEquals(await getDenoDir(), "testdenodir");
  },
});
