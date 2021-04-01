[![Node.js CI](https://github.com/oselvar/connector/actions/workflows/node.js.yml/badge.svg)](https://github.com/oselvar/connector/actions/workflows/node.js.yml)

# Oselvar Connector

Oselvar Connector is a command-line program that extracts metrics as *Oselvar CSV* from issue trackers.

These metrics can be used to display various charts, such as *cycle time scatter plots* and
*cumulative flow diagrams* on [oselvar.com](https://oselvar.com).

## Oselvar CSV

Oselvar CSV is a data format where each row represents the history of a *work item* (typically an issue or a pull request).
The first two columns (`id` and `name`) are mandatory. The following columns represent stages in the workflow, and
when the work item entered a particular stage.

Here is an example (rendered as a table for legibility):

| id     | name                                             | open       | labelled   | commented  | closed     |
| ------ | ------------------------------------------------ | ---------- | ---------- | ---------- | ---------- |
| 1      | https://github.com/bigcorp/phoenix/issues/1      | 2020-01-01 | 2020-01-02 | 2020-01-04 |            |
| 2      | https://github.com/bigcorp/phoenix/issues/2      | 2020-01-04 | 2020-01-08 |            | 2020-01-09 |
| 3      | https://github.com/bigcorp/phoenix/issues/3      | 2020-01-04 |            |            |            |
| 3      | https://github.com/bigcorp/phoenix/issues/3      | 2020-01-05 | 2020-01-06 | 2020-01-05 | 2020-01-08 |

## Generating Oselvar CSV

Oselvar Connector is a command-line tool that generates Oselvar CSV. You need [Node.js](https://nodejs.org/) installed
to use it.

### GitHub issues and pull requests

For GitHub pull requests:

    npx @oselvar/connector-github --auth $GITHUB_TOKEN --repo OWNER/NAME --type pullRequests

For GitHub issues:

    npx @oselvar/connector-github --auth $GITHUB_TOKEN --repo OWNER/NAME --type issues

For more options:

    npx @oselvar/connector-github --help

## Git Scraping

The recommended way to run Oselvar Connector is to set up a GitHub Action that updates `.oselvar/issues.csv` and
`.oselvar/pullRequests.csv` at [regular intervals](https://simonwillison.net/2020/Oct/9/git-scraping/).

Head over to https://oselvar.com to set up a GitHub action for your own project.

## Credits

The Oselvar CSV format is inspired by the formats supported by tools like [Nave](https://getnave.com/blog/loading-data-to-nave/)
and [Actionable Agile](https://55degrees.atlassian.net/wiki/spaces/AAS/pages/701727224/Uploading+CSV+or+Excel+Data#File-Format-Requirements).

