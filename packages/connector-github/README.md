# Oselvar GitHub Connector

Library and command line tool to generate [Oselvar CSV](https://github.com/oselvar/connector/#oselvar-csv) from a GitHub repo's issues.

## Installation

You need Node.js and `npm` installed

## Usage

    npx -y @oselvar/connector-github --auth GITHUB_TOKEN --repo OWNER/NAME --type issues

This will print Oselvar CSV to STDOUT

```csv
id,name,open,closed
MDU6SXNzdWU5Njg1MTM=,https://github.com/cucumber/cucumber-js/issues/1,2011-05-28T15:51:57Z,2011-05-28T22:12:08Z
MDU6SXNzdWU5Njg1MzY=,https://github.com/cucumber/cucumber-js/issues/2,2011-05-28T16:03:47Z,2011-05-28T16:35:58Z
MDU6SXNzdWU5NzEzODQ=,https://github.com/cucumber/cucumber-js/issues/3,2011-05-29T20:34:45Z,2011-07-17T19:24:18Z
MDU6SXNzdWU5ODY0NjM=,https://github.com/cucumber/cucumber-js/issues/4,2011-06-01T19:37:03Z,2015-11-16T21:42:57Z
```

For more details:

    npx -y @oselvar/connector-github --help

## Publishing to Oselvar.com

See the [setup](https://oselvar.com/setup) guide.