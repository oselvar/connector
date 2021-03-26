# Constributing to Oselvar Connector

Before you contribute, make sure you can build the code and run the tests.

## Prerequisites

You need `node` and `npm` version `7.7.0` or later. If you don't have it, upgrade:

    npm install -g npm@latest

## Install dependencies

    npm install

## Run tests

    npm test --workspaces

## Transpile the code

You don't really need to run this, but it sometimes finds errors.

    npm run build

## Format the code

This will automatically format the code for you:

    npm run eslint-fix

## Make a change

Please write tests for your code. Contributions without tests will not be accepted.
When you think you're done, send a [pull request](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/creating-a-pull-request).

## Make a release

We typically release all the modules at the same time.

    npm run release --workspaces --no-git-tag-version