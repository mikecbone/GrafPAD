# _NO LONGER MAINTAINED_

# GrafPAD

![GrafPAD Title](/GrafpadTitle.PNG)

![Maintenance](https://img.shields.io/maintenance/yes/2019)
![GitHub last commit](https://img.shields.io/github/last-commit/mikecbone/GrafPAD)
![GitHub package.json version](https://img.shields.io/github/package-json/v/mikecbone/GrafPAD)
![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/mikecbone/grafpad)

GrafPAD is a Grafana panel and dashboard editing terminal tool with additional support for adding targets to Prometheus scraping and Node-RED flows.

Its aim is to easily add new panels to Grafana and new targets for Prometheus/Node-RED scraping, based off pre-made templates. 

### Example:

You have a Grafana dashboard with a panal showing the temperature for each sensor you have. Creating a template of the panal would allow GrafPAD to add a new sensor panal to the dashboard with the user only needing to input required information such as the panal title and data source. 

Additionally, GrafPAD can then be used to automate the whole process if required, such as using GrafPAD with Ansible.

## Getting Started

### Prerequisites:

A minimum setup will require an existing [Grafana](https://grafana.com/) installation. For additional functionality [Prometheus](https://prometheus.io/) xor [Node-RED](https://nodered.org/) are required.

### Installing:

GrafPAD can be installed via npm

```
npm install -g grafpad
```

Then initialise the application with

```
grafpad --init
```

### Running:

GrafPAD can be used by simply entering into terminal

```
grafpad
```

For verbose output, run with `-v` command.

## Usage:

### Add Grafana panel by UID:

To add a panel to a grafana dashboard you need to find the UID of the dashboard.

Grafana dashboard UIDs can be found via the URL /d/`d12SE5iRt`/ or at the end of a dashboards JSON model. 

Selecting `Add Grafana panel by UID` from the main menu and following the promts will allow you to enter custom variables into the seleted template. 

On success it will display `Successfully updated dashboard` and the template panel will be added to the end of the dashboard chosen.

### Add target to Node-RED:

Node-RED flow IDs can be be found via the URL /#flow/`21ad0b6d.28f214` or in the flow information tab.

Selecting `Add target to Node-RED` from the main menu and following the promts will allow you to enter custom variables into the seleted template. 

On success it will display `Successfully updated Node-RED` and the template nodes will be added to the chosen flow.

### Add target to Prometheus:

Selecting `Add target to Prometheus` from the main menu and following the promts will allow you to enter a new target into the Prometheus config file. 

On success it will display `Successfully updated the Prometheus config file` and the entered target will be added to any chosen Prometheus scrape locations.

## Templates

### Grafana Panal Template:

Use `{{VAR_NAME_HERE}}` as string variables in the template.

Use `{i{VAR_NAME_HERE}}` as int variables in the template.

Panel grid positions will be automatically calculated and updated.

Panal ID will be automatically generated.

Example:

```JSON
{
  "aliasColors": {},
  "bars": false,
  "dashLength": 10,
  "dashes": false,
  "datasource": "{{DATASOURCE}}",
  "fill": 1,
  "fillGradient": "{i{FILL_AMOUNT}}",
  "gridPos": {
    "h": 9,
    "w": 12,
    "x": 0,
    "y": 0
  },
  "id": 5,
  "legend": {
    "avg": false,
    "current": false,
    "max": false,
    "min": false,
    "show": true,
    "total": false,
    "values": false
  },
  "lines": true,
  "linewidth": 1,
  "nullPointMode": "null",
  "options": {
    "dataLinks": []
  },
  "percentage": false,
  "pointradius": 2,
  "points": false,
  "renderer": "flot",
  "seriesOverrides": [],
  "spaceLength": 10,
  "stack": false,
  "steppedLine": false,
  "targets": [
    {
      "groupBy": [],
      "measurement": "{{MEASUREMENT}}",
      "orderByTime": "ASC",
      "policy": "default",
      "refId": "A",
      "resultFormat": "time_series",
      "select": [
        [
          {
            "params": [
              "isOnline"
            ],
            "type": "field"
          }
        ]
      ],
      "tags": []
    }
  ],
  "thresholds": [],
  "timeFrom": null,
  "timeRegions": [],
  "timeShift": null,
  "title": "{{TITLE}}",
  "tooltip": {
    "shared": true,
    "sort": 0,
    "value_type": "individual"
  },
  "type": "graph",
  "xaxis": {
    "buckets": null,
    "mode": "time",
    "name": null,
    "show": true,
    "values": []
  },
  "yaxes": [
    {
      "format": "short",
      "label": null,
      "logBase": 1,
      "max": null,
      "min": null,
      "show": true
    },
    {
      "format": "short",
      "label": null,
      "logBase": 1,
      "max": null,
      "min": null,
      "show": true
    }
  ],
  "yaxis": {
    "align": false,
    "alignLevel": null
  }
}
```

### Node-RED Flow Template:

Use `{{VAR_NAME_HERE}}` as string variables in the template.

Use `{i{VAR_NAME_HERE}}` as int variables in the template.

Node IDs will be automatically generated and wire link IDs will be automatically updated.

Example:

```JSON
[
  {
      "id": "d419c2a0.6647f",
      "type": "ping",
      "z": "4ccf9c67.de5d94",
      "name": "",
      "host": "{{HOST}}",
      "timer": "60",
      "x": 150,
      "y": 80,
      "wires": [
          [
              "ff11aacf.905ef8"
          ]
      ]
  },
  {
      "id": "ff11aacf.905ef8",
      "type": "function",
      "z": "4ccf9c67.de5d94",
      "name": "Set Device Params",
      "func": "msg.ping = msg.payload\nmsg.devId = \"{{DEVICE_NAME}}\"\nreturn msg;",
      "outputs": 1,
      "noerr": 0,
      "x": 350,
      "y": 80,
      "wires": [
          [
              "a1b53515.d8dc48"
          ]
      ]
  },
  {
      "id": "a1b53515.d8dc48",
      "type": "link out",
      "z": "4ccf9c67.de5d94",
      "name": "TTN_LIV_PING",
      "links": [
          "4422fa4a.5e2044"
      ],
      "x": 515,
      "y": 80,
      "wires": []
  }
]
```



## Dependencies

- `yargs` for command line arguments
- `axios` for HTTP requests
- `boxen` for terminal styling
- `chalk` for terminal styling
- `prompts` for user prompts
- `figlet` for terminal styling
- `openExplorer` for file exploration
- `editJsonFile` for JSON editing
- `yaml` for YAML editing
- `uuidv4` for ID generation
- `updateNotifier` for update notifications

## Roadmap

TODO

## License

This project is licensed under the ISC License
