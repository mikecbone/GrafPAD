# GrafPAD

![GrafPAD Title](GrafpadTitle.png)

![Maintenance](https://img.shields.io/maintenance/yes/2019)
![GitHub last commit](https://img.shields.io/github/last-commit/mikecbone/GrafPAD)
![GitHub package.json version](https://img.shields.io/github/package-json/v/mikecbone/GrafPAD)
![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/mikecbone/grafpad)

GrafPAD is a Grafana panel and dashboard editing terminal tool with additional support for adding targets to Prometheus scraping and Node-RED flows.

Its aim is to easily add new panels to Grafana and new targets for Prometheus/Node-RED scraping, based off pre-made templates. 

### Example

You have a Grafana dashboard with a panal showing the temperature for each sensor you have. Creating a template of the panal would allow GrafPAD to add a new sensor panal to the dashboard with the user only needing to input required information such as the panal title and data source. 

Additionally, GrafPAD can then be used to automate the whole process if required, such as using GrafPAD with Ansible.

## Getting Started

### Prerequisites

A minimum setup will require an existing [Grafana](https://grafana.com/) installation. For additional functionality [Prometheus](https://prometheus.io/) xor [Node-RED](https://nodered.org/) are required.

### Installing

GrafPAD can be installed via npm

```
npm install -g grafpad
```

Then initialise the application with

```
grafpad --init
```

### Running

GrafPAD can be used by simply entering into terminal

```
grafpad
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

## Roadmap

TODO

## License

This project is licensed under the MIT License
