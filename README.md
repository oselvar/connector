[![Node.js CI](https://github.com/oselvar/connector/actions/workflows/node.js.yml/badge.svg)](https://github.com/oselvar/connector/actions/workflows/node.js.yml)


# Oselvar Connector

Oselvar Connector is a command-line program for generating Oselvar CSV.

## Oselvar CSV

Oselvar CSV is a data format that represents work items and the timestamps when
they entered various stages in a workflow. Here is an example (rendered as a table
for legibility):

| id     | name                                             | Todo       | Doing      | Done       |
| ------ | ------------------------------------------------ | ---------- | ---------- | ---------- |
| 1 | https://github.com/bigcorp/phoenix/issues/1           | 2020-01-01 | 2020-01-01 | 2020-01-09 |
| 2 | https://github.com/bigcorp/phoenix/issues/2           | 2020-01-04 | 2020-01-08 |            |
| 3 | https://github.com/bigcorp/phoenix/issues/3           | 2020-01-04 |            |            |
| 3 | https://github.com/bigcorp/phoenix/issues/3           | 2020-01-05 | 2020-01-06 |            |

The structure is similar to the formats pioneered by tools like [Nave](https://getnave.com/blog/loading-data-to-nave/)
and [Actionable Agile](https://55degrees.atlassian.net/wiki/spaces/AAS/pages/701727224/Uploading+CSV+or+Excel+Data#File-Format-Requirements).

## Generating Oselvar CSV

The easiest way to construct these CSVs is to use the Oselvar Connector command-line tool, which
knows have to construct Oselvar CSV from GitHub issues and JIRA:

    oselvar github --repo bigcorp/phoenix --type pullRequests > bigcorp/phoenix/pullRequests.csv

## Git Scraping

The `oselvar` commane-line tool can be run as a GitHub Action at regular intervals to automatically
update a CSV file and commit it to git.

For more information about this technique, see [Git Scraping](https://simonwillison.net/2020/Oct/9/git-scraping/).
