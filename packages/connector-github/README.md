# Flow GitHub

Library and command line tool to generate _Flow Events CSV_ from a GitHub repo's issues.

## Usage

    flow-jira --auth ACCESS_TOKEN --repo OWNER/NAME

This will output Flow events as CSV:

```csv
timestamp,transition,id
2017-09-05T16:14:08Z,open,1
2020-01-17T10:12:07Z,close,1
2019-09-19T14:47:25Z,open,3
2020-01-17T10:18:12Z,close,3
2020-01-16T23:12:23Z,open,4
2020-01-17T10:05:52Z,close,4
2020-11-02T19:04:11Z,open,5
```

This csv can be sorted with `sort`

### Local CFD

To try out the CFD locally:

You can pipe the output to `flow-markings` and then to `flow-cfd`.

Or more conveniently, just specify `--flow-markings` or `--flow-cfd`

### Ideas

Fetch labels and commits

### Graph notes

- Transforms issues to work items.
- See https://55degrees.atlassian.net/wiki/spaces/AAS/pages/701727224/Uploading+CSV+or+Excel+Data#File-Format-Requirements
-
- To determine the order of steps, look into markov chains
- https://setosa.io/blog/2014/07/26/markov-chains/index.html
- https://en.wikipedia.org/wiki/Markov_chain#Queueing_theory
- https://github.com/mogoh/ts-markov
- https://introcs.cs.princeton.edu/java/98simulation/MarkovChain.java.html
- https://rosettacode.org/wiki/Markov_chain_text_generator#Java
-
- Shortest path - see Bellman-Ford or Dijsktra
- - https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5020038/
