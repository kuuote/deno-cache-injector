TOOLS := ${CURDIR}/.tools

.DEFAULT_GOAL := help

help:
	@cat $(MAKEFILE_LIST) | \
	    perl -ne 'print if /^\w+.*##/;' | \
	    perl -pe 's/(.*):.*##\s*/sprintf("%-20s",$$1)/eg;'

tools: FORCE	## Install development tools
	@mkdir -p ${TOOLS}
	@deno install -A -f -n udd --root ${TOOLS} https://deno.land/x/udd@0.4.0/main.ts

fmt: FORCE	## Format code
	@deno fmt --ignore=.deno

fmt-check: FORCE	## Format check
	@deno fmt --check --ignore=.deno

lint: FORCE	## Lint code
	@deno lint --ignore=.deno

type-check: FORCE	## Type check
	@deno test --unstable --no-run $$(find . -name '*.ts' -not -name '.deno')

test: FORCE	## Test
	@deno test --unstable -A

gen: FORCE	## Generate codes
	@deno run --unstable -A ./scripts/gen-function/gen-function.ts
	@deno run --unstable -A ./scripts/gen-option/gen-option.ts
	@make fmt

update: FORCE	## Update dependencies
	@${TOOLS}/bin/udd $$(find ./denops_std -name '*.ts' -not -name '.deno')
	@make fmt

FORCE:
