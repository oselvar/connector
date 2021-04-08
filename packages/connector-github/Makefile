SOURCE_CODE = $(shell find src -name "*.ts")

default: data/cucumber/cucumber/issues.csv \
         data/cucumber/cucumber/pullRequests.csv \
         data/cucumber/cucumber-ruby/issues.csv \
         data/cucumber/cucumber-ruby/pullRequests.csv \
         data/cucumber/cucumber-jvm/issues.csv \
         data/cucumber/cucumber-jvm/pullRequests.csv \
         data/cucumber/cucumber-js/issues.csv \
         data/cucumber/cucumber-js/pullRequests.csv \
#		 data/DefinitelyTyped/DefinitelyTyped/issues.csv

data/%/issues.csv: $(SOURCE_CODE) check-env
	mkdir -p $(@D)
	./bin/oselvar-github-dev --auth $(GITHUB_TOKEN) --type issues --repo $(@:data/%/issues.csv=%) > $@

data/%/pullRequests.csv: $(SOURCE_CODE) check-env
	mkdir -p $(@D)
	./bin/oselvar-github-dev --auth $(GITHUB_TOKEN) --type pullRequests --repo $(@:data/%/pullRequests.csv=%) > $@

#data/DefinitelyTyped/DefinitelyTyped/issues.csv: $(SOURCE_CODE)
#	mkdir -p $(@D)
#	./bin/oselvar-github-dev --auth $(GITHUB_TOKEN) \
#		--repo DefinitelyTyped/DefinitelyTyped \
#		--stages "open,Needs Maintainer Action,Needs Maintainer Review,Waiting for Code Reviews,Needs Author Action,Waiting for Author to Merge,Recently Merged,closed" \
#		--type pullRequests \
#		--pages 200 \
#		--direction backward \
#		> $@

check-env:
ifndef GITHUB_TOKEN
	$(error GITHUB_TOKEN is undefined)
endif
.PHONY: check-env
