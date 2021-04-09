SOURCE_CODE = $(shell find src -name "*.ts")

default: data/SmartBear/BDD.csv

data/SmartBear/BDD.csv: $(SOURCE_CODE) check-env
	mkdir -p $(@D)
	./bin/oselvar-jira-dev --email $(JIRA_EMAIL) --token $(JIRA_TOKEN) --url https://smartbear.atlassian.net --key BDD \
	  --stages "13269-Next:Next,13257-Development:Development,13261-Development Done:Development Done,13258-Available to users:Available to users" > $@

check-env:
ifndef JIRA_EMAIL
	$(error JIRA_EMAIL is undefined)
endif
ifndef JIRA_TOKEN
	$(error JIRA_TOKEN is undefined)
endif
.PHONY: check-env
