#!/usr/bin/env python3
"""Assemble harness + app JS and run the test suite under JavaScriptCore (jsc)."""
import re, subprocess, json, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
JSC = "/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"

def main():
    html = open(os.path.join(ROOT, "index.html")).read()
    app_js = re.findall(r"<script>(.*?)</script>", html, flags=re.S)[0]
    map_json = open("/tmp/map-data.json").read()
    ids = sorted(set(re.findall(r"id=([\w-]+)", html)))
    id_reg = ";".join(f'registerEl("{i}", mkEl("div"));' for i in ids)
    tail = open(os.path.join(HERE, "runner.js")).read().split('load("app.js");', 1)[1]
    parts = [
        open(os.path.join(HERE, "harness.js")).read(),
        id_reg,
        "getEl(\"map-data\").textContent = " + json.dumps(map_json) + ";",
        app_js,
        tail,
    ]
    assembled = os.path.join(HERE, "assembled.js")
    open(assembled, "w").write("\n".join(parts))
    r = subprocess.run([JSC, assembled], capture_output=True, text=True, timeout=240)
    print(r.stdout, end="")
    if r.stderr:
        print("STDERR:", r.stderr[:2000], file=sys.stderr)
    return r.returncode

if __name__ == "__main__":
    sys.exit(main())
