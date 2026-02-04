GITHUB_REPO ?= oselvar/connector

.PHONY: all clean

all: cycle-time.svg cycle-time-terminal.png cycle-time.txt

clean:
	rm -f data.csv cycle-time.tsv cycle-time.txt cycle-time.gp cycle-time.svg cycle-time-terminal.png

.PRECIOUS: data.csv cycle-time.tsv cycle-time.txt cycle-time.svg cycle-time-terminal.png

data.csv:
	pnpm exec tsx packages/cli/src/main.ts data github --auth "$$GITHUB_TOKEN" --repo $(GITHUB_REPO) --type issues --pages 3 > $@

cycle-time.tsv: data.csv
	pnpm exec tsx packages/cli/src/main.ts cycle-time --from open --to closed --format youplot --date-format unix --input $< > $@

cycle-time.txt: cycle-time.tsv
	uplot scatter -H -t "Cycle Time" -C --canvas block -w 80 -h 25 --xlabel "date (unix)" -o $@ < $<

cycle-time.gp: data.csv
	pnpm exec tsx packages/cli/src/main.ts cycle-time --from open --to closed --format gnuplot --input $< > $@

cycle-time.svg: cycle-time.gp
	gnuplot $< 2>/dev/null

cycle-time-terminal.png: cycle-time.txt
	cat $< | $$(go env GOPATH)/bin/textimg -b white --foreground black -f /System/Library/Fonts/Monaco.ttf -o $@
