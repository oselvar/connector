# Oselvar JIRA Connector

Library and command line tool to generate [Oselvar CSV](https://github.com/oselvar/connector/#oselvar-csv) from a 
JIRA project.

## Get a JIRA token

Generate a new [API Token](https://id.atlassian.com/manage-profile/security/api-tokens) and label it `oselvar`.
Store this safely and assign it to a `JIRA_TOKEN` environment variable.

## Usage

Start by running the connector once without specifying stages:

    oselvar-jira --email $JIRA_EMAIL --token $JIRA_TOKEN --url $JIRA_URL --key $JIRA_KEY

The first line of the generated CSV will look something like this:

```csv
id,name,13257-Development,13269-Next,13258-Deployed,13261-Development Done
```

* Open a text editor and paste the line in there
* Remove the `id` and `name` columns
* Reorder the values so they reflect the stages on your board (You may want to remove some stages that are not part of your workflow).

Now you'll have something like this:

```csv
13269-Next,13257-Development,13261-Development Done,13258-Deployed
```

The next thing to do is to map these values to something more readable, by adding a `:` followed by the name you want in the CSV.

```csv
13269-Next:Next,13257-Development:Development,13261-Development Done:Development Done,13258-Deployed:Deployed
```

Now you can run the connector again:

    oselvar-jira --email $JIRA_EMAIL --token $JIRA_TOKEN --url $JIRA_URL --key $JIRA_KEY \
      --stages "13269-Next:Next,13257-Development:Development,13261-Development Done:Development Done,13258-Deployed:Deployed"

You should now get a CSV with the following headers

```csv
id,name,Next,Development,Development Done,Deployed
```

That's it!