#!/usr/bin/env node

// ----- INTERNAL IMPORTS -----
const fs = require('fs'); // File system 
const {exec} = require('child_process'); // Command line
const path = require('path'); // Cross platform path tool
const os = require('os'); // For OS agnostic newlines

// ----- ADDITIONAL IMPORTS -----
const yargs = require('yargs'); // Command line arguements
const axios = require('axios'); // HTTP Client
const boxen = require('boxen'); // Boxes in terminal
const chalk = require('chalk'); // Terminal string styling
const prompts = require('prompts'); // User promts
const figlet = require('figlet'); // Large text styling
const openExplorer = require('open-file-explorer'); // File explorer
const editJsonFile = require('edit-json-file'); // JSON editor
const yaml = require('js-yaml'); // YAML editor
const uuidv4 = require('uuid/v4'); // Random IDs
const updateNotifier = require('update-notifier'); // Update notifier
const pkg = require('../package.json'); // Required for update notifier

// ----- CONSTANTS -----
const options = yargs.argv; // Get command line options eg: debug
const appDirPath = path.join(os.homedir(), '.grafpad');
const MENU_SLEEP_TIME = 1500;
const NEWLINE = () => console.log(os.EOL);

const ENV_FILE = path.join(appDirPath, '.env');
const GIT_FILE = path.join(appDirPath, '.gitignore');
const TEMPLATES_DIR = path.join(appDirPath, 'templates');
const FILES_DIR = path.join(appDirPath, 'files');
const TEMP_DIR = os.tmpdir();

const GRAFANA_URL_MESSAGE = 'Enter Grafana URL (eg: http://localhost:3000)';
const GRAFANA_URL_ENVNAME = 'GRAFANA_URL';
const GRAFANA_URL_NAME = 'Grafana URL';
const GRAFANA_API_MESSAGE = 'Enter Grafana API Key';
const GRAFANA_API_ENVNAME = 'GRAFANA_API_KEY';
const GRAFANA_API_NAME = 'Grafana API Key';
const NODERED_URL_MESSAGE = 'Enter Node-RED URL (eg: http://localhost:1880)';
const NODERED_URL_ENVNAME = 'NODERED_URL';
const NODERED_URL_NAME = 'Node-RED URL';
const NODERED_API_MESSAGE = 'Enter Node-RED API Key';
const NODERED_API_ENVNAME = 'NODERED_API_KEY';
const NODERED_API_NAME = 'Node-RED API Key';
const PROMETHEUS_URL_MESSAGE = 'Enter Prometheus URL (eg: http://localhost:9090)';
const PROMETHEUS_URL_ENVNAME = 'PROMETHEUS_URL';
const PROMETHEUS_URL_NAME = 'Prometheus URL';
const PROMETHEUS_CONFIG_MESSAGE = 'Enter Prometheus config file location (eg: /etc/prometheus/prometheus.yml)';
const PROMETHEUS_CONFIG_ENVNAME = 'PROMETHEUS_CONFIG';
const PROMETHEUS_CONFIG_NAME = 'Prometheus Config Location';

require('dotenv').config({path: ENV_FILE});

// ----- OPENING CODE -----
// Checks for available update and returns an instance
const notifier = updateNotifier({pkg, updateCheckInterval: 60});
// Notify using the built-in convenience method
notifier.notify();

if (options.init){
  initialise();
} 
else if (process.env.INIT != 'true') {
  console.log(chalk.red('[-] Error: GrafPAD not initialised. Please run ' + chalk.yellow('grafpad --init')));
} 
else {
  title();
  setTimeout(menu, 700);
}

/**
 * Initialise GrafPAD with required folder structure and files
 */
async function initialise() { //TODO: THIS RESETS ON EACH UPDATE
  setFolderStructure();
  await setEnvVar(GRAFANA_URL_MESSAGE, GRAFANA_URL_NAME, GRAFANA_URL_ENVNAME);
  await setEnvVar(GRAFANA_API_MESSAGE, GRAFANA_API_NAME, GRAFANA_API_ENVNAME);
  await setEnvVar(NODERED_URL_MESSAGE, NODERED_URL_NAME, NODERED_URL_ENVNAME);
  await setEnvVar(NODERED_API_MESSAGE, NODERED_API_NAME, NODERED_API_ENVNAME);
  await setEnvVar(PROMETHEUS_URL_MESSAGE, PROMETHEUS_URL_NAME, PROMETHEUS_URL_ENVNAME);
  await setEnvVar(PROMETHEUS_CONFIG_MESSAGE, PROMETHEUS_CONFIG_NAME, PROMETHEUS_CONFIG_ENVNAME);
  fs.appendFileSync(ENV_FILE, '\nINIT=true');
  console.log(chalk.green('[+] GrafPAD initialised. Start with ' + chalk.yellow('grafpad')));
}

/**
 * Show the title box
 */
function title() {
  // Title
  console.log(
    boxen(
      chalk.hex('FF7700')(figlet.textSync("GrafPAD")+"\nGrafana Panel and Dashboard Editing Tool")
      + chalk.yellow('\n- Support for Prometheus and Node-RED -\n')
      + chalk.magenta(os.platform() + os.arch() + ' - v0.1.4 - TRDT'),
      {
        padding: 1, float: 'center', align: 'center', border: 'bold'
      }
    )
  );
}

/**
 * Show the main menu
 */
async function menu() {
  NEWLINE();
  (async () => {
    const response = await prompts({
      type: 'select',
      name: 'value',
      message: 'Menu',
      choices: [
        { title: 'Add Grafana panel by UID', description: 'Add a panel from templates to a dashboard by UID', value: 1},
        { title: 'Add target to Node-RED', description: 'Add a target to Node-RED monitoring', value: 2},
        { title: 'Add target to Prometheus', description: 'Add a scraping target to Prometheus', value: 3},
        { title: 'Get dashboard JSON by UID', description: 'Retrieve the JSON of a dashboard by UID', value: 4},
        { title: 'Manage templates', description: 'Manage Grafana JSON templates', value: 5},
        { title: 'Manage initialised variables', description: 'Manage environment variables setup at initialisation', value: 6},
        { title: 'Exit', description: 'Exit GrafPAD', value: 99},
      ],
      initial: 0,
      hint: '- Space to select'
    });
    NEWLINE();
    switch (response.value)
    {
      case 99:
        exitApp();
        break;
      case 1:
        menuPanelByUid();
        break;
      case 2:
        menuAddTargetToNodeRed();
        break;
      case 3:
        menuAddTargetToPrometheus();
        break;
      case 4:
        menuDashboardJsonByUid();
        break;
      case 5:
        menuTemplates();
        break;
      case 6:
        menuManageVariables();
        break;
      default:
        console.log("Nothing selected. Exiting...");
        exitApp();
        break;
    }
  })();
}

// ----- MENU FUNCTIONS -----
async function menuTemplates() {
  let response = await promptShowOrAddTemplates();

  if(response === 1) {
    displayTemplates();
    setTimeout(menu, MENU_SLEEP_TIME);
  }
  else if (response === 2) {
    openDir(TEMPLATES_DIR);
    setTimeout(menu, MENU_SLEEP_TIME);
  }
}

async function menuPanelByUid() {
  let uid = await promptForUid('Enter dashboard UID');

  if (uid === undefined || uid === '') {
    console.log(chalk.red('[-] Error: Undefined UID'));
    return;
  }

  getDashboardJsonByUid(uid, function(returnValue) {
    handleDashboardJson(returnValue);
  })
}

async function menuDashboardJsonByUid() {
  let uid = await promptForUid('Enter dashboard UID');

  if (uid === undefined || uid === '') {
    console.log(chalk.red('[-] Error: Undefined UID'));
    return;
  }

  getDashboardJsonByUid(uid, async function(returnValue) {
    console.log(returnValue);

    let response = await promptYesOrNo('Save dashboard JSON?');
    if (response === true) {
      setDashboardJsonToDisk(returnValue);
    }

    setTimeout(menu, MENU_SLEEP_TIME);
  });
}

async function menuAddTargetToNodeRed() { //TODO: Refactor this method
  let uid = await promptForUid('Enter flow UID');
  const url = process.env.NODERED_URL + '/flow/' + uid;

  let config = {
    headers: {
      'Accept': "application/json", 
      'Content-Type': 'application/json',
    }
  };

  // Add API key header if available
  process.env.NODERED_API_KEY != '' ? config.headers.Authorization = 'Bearer ' + process.env.NODE_API_KEY : null;

  axios.get(
    url, config
  ).then(async res => {
    if(res.status === 200){
      NEWLINE();
      console.log(`${res.status}: ${res.statusText}`);
      console.log(chalk.green('Successfully got Node-RED active flows configuration'));

      // Save the downloaded flow file 
      const dirPath = path.join(TEMP_DIR, 'nodered_flows.json');
      tryWriteFileSync(dirPath, JSON.stringify(res.data));

      // Load the dashboard json file to edit
      let jsonFile = editJsonFile(dirPath);

      // Pull out the nodes, flowid and final node x and y position
      var jsonNodes = jsonFile.get('nodes');
      const flowid = jsonFile.get('id');
      const lastX = jsonNodes[jsonNodes.length - 1].x;
      const lastY = jsonNodes[jsonNodes.length - 1].y;

      // Load the template and parse as object TODO: This code is repeated
      let noOfTemplates = displayTemplates();
      if(noOfTemplates === -1) {return};
      let templateChoice = await promtForTemplate(noOfTemplates);
      let templateName = getTemplateName(templateChoice);
      const templatePath = path.join(TEMPLATES_DIR, `${templateName}.json`);
      let rawTemplate = tryReadFileSync(templatePath); //TODO: Check the template and warn if it doesnt look like node red json
      var template = JSON.parse(rawTemplate);

      // Input custom values into template as strings
      var templateString = JSON.stringify(template);
      templateString = await replaceStringVariables(templateString);
      templateString = await replaceIntVariables(templateString);

      // Parse and add the template to the json flow nodes object
      template = JSON.parse(templateString);
      var idDict = {};
      let length = template.length;
      for(let i=0; i < length; i++) {
        let newId = uuidv4();
        idDict[template[i].id] = newId;
        template[i].id = newId;
        template[i].z = flowid;
        template[i].x = lastX + 100 + (i * 100);
        template[i].y = lastY + 100 + (i * 100);
        jsonNodes.push(template[i]);
      }

      // Set the wire id's to the new given ids
      var getNodes = jsonFile.toObject();
      for(let j=0; j<jsonNodes.length; j++) {
        let wires = jsonNodes[j].wires[0];

        if (wires != undefined){
          for(let k=0; k<wires.length; k++){
            getNodes.nodes[j].wires[0][k] = idDict[wires[k]];
          }
        }
      }

      // Set the updated template into the json file
      jsonFile.set('nodes', jsonNodes);
      jsonFile.save();

      // Post to nodered
      setNoderedFlowByUid(jsonFile.data, uid);
    }
    else {
      NEWLINE();
      console.log(`${res.status}: ${res.statusText}`);
      console.log(chalk.red('[-] Error contacting Node-RED'));
    }
  }).catch(err => {
    console.log(chalk.red('[-] Error contacting Node-RED. URL and API key correct?'));
    if (options.v) {
      console.log(err);
    }
    return;
  });
}

function menuAddTargetToPrometheus() { //TODO: Refactor this method
  if(!fs.existsSync(process.env.PROMETHEUS_CONFIG)) {
    console.log(chalk.red('[-] Prometheus config location does not appear to exist'));
    return;
  }

  const url = process.env.PROMETHEUS_URL + "/api/v1/status/config";

  axios.get(url).then(async res => {
    if(res.status === 200){
      NEWLINE();
      console.log(`${res.status}: ${res.statusText}`);
      console.log(chalk.green('Successfully got config file'));

      // Save the downloaded config file and open it in yaml module
      const dirPath = path.join(TEMP_DIR, 'prometheus_config.yml');
      tryWriteFileSync(dirPath, res.data.data.yaml);
      let doc = yaml.safeLoad(tryReadFileSync(dirPath));
      console.log(doc);

      // Get the target identifier to add
      let target = await promtForInput('Enter target address to add to Prometheus');

      // Loop through configs to add target to
      for (let i=0; i<doc.scrape_configs.length; i++){
        const name = doc.scrape_configs[i].job_name;
        let response = await promptYesOrNo(`Add target to job: ${name}`);
        if (response === true){
          doc.scrape_configs[i].static_configs[0].targets.push(target);
          console.log(chalk.green(`Added ${target} to ${name}`));
        }
      }

      // Save the new yaml file and back up the old one
      let oldDoc = yaml.safeLoad(tryReadFileSync(process.env.PROMETHEUS_CONFIG));
      let saveLocation = process.env.PROMETHEUS_CONFIG.split('prometheus.yml')[0];
      tryWriteFileSync(saveLocation, yaml.safeDump(oldDoc));
      tryWriteFileSync(process.env.PROMETHEUS_CONFIG, yaml.safeDump(doc));

      exec('sudo service prometheus restart && sudo service prometheus status', (err, stdout, stderr) => { //TODO: Check this works
        if (err) {
          console.log(chalk.red('[-] Error: Cannot restart Prometheus'));
          if (options.v) {
            console.log(err);
          }
          return;
        }

        console.log(stdout);
        console.log(stderr);
        console.log(chalk.green('Successfully updated the Prometheus config file'));
      });

      setTimeout(menu, MENU_SLEEP_TIME);
    }
    else {
      NEWLINE();
      console.log(`${res.status}: ${res.statusText}`);
      console.log(chalk.red('[-] Error contacting prometheus'));
    }
  }).catch(err => {
    console.log(chalk.red('[-] Error connecting to Prometheus. URL Correct?'));
    if (options.v) {
      console.log(err);
    }
    return;
  });
}

async function menuManageVariables() {
  let response = await promtManageVariables();

  switch (response)
    {
      case 1:
        manageEnvVar(process.env.GRAFANA_URL, GRAFANA_URL_MESSAGE, GRAFANA_URL_NAME, GRAFANA_URL_ENVNAME);
        break;
      case 2:
        manageEnvVar(process.env.GRAFANA_API_KEY, GRAFANA_API_MESSAGE, GRAFANA_API_NAME, GRAFANA_API_ENVNAME);
        break;
      case 3:
        manageEnvVar(process.env.NODERED_URL, NODERED_URL_MESSAGE, NODERED_URL_NAME, NODERED_URL_ENVNAME);
        break;
      case 4:
        manageEnvVar(process.env.NODERED_API_KEY, NODERED_API_MESSAGE, NODERED_API_NAME, NODERED_API_ENVNAME);
        break;
      case 5:
        manageEnvVar(process.env.PROMETHEUS_URL, PROMETHEUS_URL_MESSAGE, PROMETHEUS_URL_NAME, PROMETHEUS_URL_ENVNAME);
        break;
      case 6:
        manageEnvVar(process.env.PROMETHEUS_CONFIG, PROMETHEUS_CONFIG_MESSAGE, PROMETHEUS_CONFIG_NAME, PROMETHEUS_CONFIG_ENVNAME);
        break;
      case 99:
        setTimeout(menu, MENU_SLEEP_TIME);
        break;
      default:
        console.log("Nothing selected. Exiting...");
        exitApp();
        break;
    }
}

function exitApp() {
  process.exit();
}

// ----- SET AND GETS -----
function setFolderStructure() {
  if (!fs.existsSync(appDirPath)){
    fs.mkdirSync(path.join(os.homedir(), '.grafpad'));
  }
  if (!fs.existsSync(TEMPLATES_DIR)){
    fs.mkdirSync(TEMPLATES_DIR);
  }
  if (!fs.existsSync(FILES_DIR)){
    fs.mkdirSync(FILES_DIR);
  }
  if (!fs.existsSync(GIT_FILE)){
    tryWriteFileSync(GIT_FILE, '.env\nnode_modules\nstore/temp\n.DS_Store\n');
  }
  tryWriteFileSync(ENV_FILE, '');
  console.log(chalk.green('Folder Structure Set\n'));
}

async function setEnvVar(message, name, envName) {
  let env = await promtForInput(message);

  if (env != undefined){
    let regexp = new RegExp(envName + '=.+', 'g');
    let envFile = fs.readFileSync(ENV_FILE);
    let envFileString = envFile.toString();

    // Update current env var if it exists
    if (envFileString.search(regexp) >= 0) {
      let result = envFileString.replace(regexp, envName+'='+env);
      fs.writeFileSync(ENV_FILE, result);
    }
    //Else append it
    else {
      fs.appendFileSync(ENV_FILE, '\n'+envName+'='+env);
      console.log(chalk.green(name + ' Set\n'));
    }
  }
  else {
    console.log(chalk.red(name + ' Undefined'));
    process.exit();
  }

  process.env.GRAFANA_API_KEY = 'ichangedit';
}

async function getDashboardJsonByUid(uid, callback) {
  if(process.env.GRAFANA_API_KEY === undefined || process.env.GRAFANA_API_KEY == ''){
    console.log(chalk.red(GRAFANA_API_NAME + ' Not Set\n'));
    return;
  }
  if(process.env.GRAFANA_URL == undefined || process.env.GRAFANA_URL == ''){
    console.log(chalk.red(GRAFANA_URL_NAME + ' Not Set\n'));
    return;
  } //TODO: Add these checks for other services. 

  const baseUrl = process.env.GRAFANA_URL + "/api/dashboards/uid/";
  const url = baseUrl + String(uid);

  axios.get(
    url, {
      headers: {
        'Accept': "application/json", 
        'Content-Type': 'application/json', 
        'Authorization': 'Bearer ' + process.env.GRAFANA_API_KEY
      }
    }
  ).then(res => {
    callback(res.data);
  }).catch(err => {
    console.log(chalk.red('[-] Error contacting Grafana. URL and API key correct?'));
    if (options.v) {
      console.log(err);
    }
    return;
  });
}

async function setDashboardJsonByUid(json) {
  if(process.env.GRAFANA_API_KEY === undefined || process.env.GRAFANA_API_KEY == ''){
    console.log(chalk.red(GRAFANA_API_NAME + ' Not Set\n'));
    return;
  }
  if(process.env.GRAFANA_URL == undefined || process.env.GRAFANA_URL == ''){
    console.log(chalk.red(GRAFANA_URL_NAME + ' Not Set\n'));
    return;
  }

  const baseUrl = process.env.GRAFANA_URL + "/api/dashboards/db";

  axios.post(
    baseUrl, {
      "dashboard": json,
      "folderId": 0,
      "overwrite": true
    }, {
      headers: {
        'Accept': "application/json", 
        'Content-Type': 'application/json', 
        'Authorization': 'Bearer ' + process.env.GRAFANA_API_KEY
      }
    }
  ).then(res => {
    if(res.status === 200){
      NEWLINE();
      console.log(`${res.status}: ${res.statusText}`);
      console.log(chalk.green('Successfully updated dashboard'));
    }
    else {
      NEWLINE();
      console.log(`${res.status}: ${res.statusText}`);
      console.log(chalk.red('[-] Error posting to Grafana'));
    }
  }).catch(err => {
    console.log(chalk.red('[-] Error contacting Grafana. URL and API key correct?'));
    if (options.v) {
      console.log(err);
    }
    return;
  });

  setTimeout(menu, MENU_SLEEP_TIME);
}

async function setNoderedFlowByUid(json, uid) {
  const url = process.env.NODERED_URL + '/flow/' + uid;

  let config = {
    headers: {
      'Accept': "application/json", 
      'Content-Type': 'application/json',
    }
  }

  // Add API key header if available TODO: Check api key bearer works
  process.env.NODERED_API_KEY != '' ? config.headers.Authorization = 'Bearer ' + process.env.NODE_API_KEY : null;

  axios.put(
    url, json, config
  ).then(res => {
    if(res.status === 200){
      NEWLINE();
      console.log(`${res.status}: ${res.statusText}`);
      console.log(chalk.green('Successfully updated Node-RED'));
    }
    else {
      NEWLINE();
      console.log(`${res.status}: ${res.statusText}`);
      console.log(chalk.red('[-] Error posting to Node-RED'));
    }
  }).catch(err => {
    console.log(chalk.red('[-] Error contacting Node-RED. URL and API key correct?'));
    if (options.v) {
      console.log(err);
    }
    return;
  });

  setTimeout(menu, MENU_SLEEP_TIME);
}

function getTemplateName(templateChoice) {
  let file = fs.readdirSync(TEMPLATES_DIR)[templateChoice];
  let split = file.split('.');
  return split[0];
}

function setDashboardJsonToDisk(json) {
  const dirPath = path.join(FILES_DIR, 'json.json');
  tryWriteFileSync(dirPath, JSON.stringify(json));

  openDir(FILES_DIR);
}

// ----- PROMPTS -----
async function promptYesOrNo(message) {
  const response = await prompts({
    type: 'confirm',
    name: 'value',
    message: message,
    initial: false,
  });

  return response.value;
}

async function promtManageVariables() {
  const response = await prompts({
    type: 'select',
    name: 'value',
    message: 'Environment Variables',
    choices: [
      { title: 'Grafana URL', description: 'Manage the Grafana URL', value: 1 },
      { title: 'Grafana API Key', description: 'Manage the Grafana API Key', value: 2},
      { title: 'Node-RED URL', description: 'Manage the Node-RED URL', value: 3},
      { title: 'Node-RED API Key', description: 'Manage the Node-RED API Key', value: 4},
      { title: 'Prometheus URL', description: 'Manage the Prometheus URL', value: 5},
      { title: 'Prometheus Config', description: 'Manage the Prometheus Config File Location', value: 6},
      { title: 'Main Menu', description: 'Go Back to the Main Menu', value: 99},
    ],
    initial: 0,
    hint: '- Space to select'
  });

  return response.value;
}

async function promptShowOrAddTemplates() {
  const response = await prompts({
    type: 'select',
    name: 'value',
    message: 'JSON Templates',
    choices: [
      { title: 'Show current templates', description: 'View list of templates that GrafPAD has detected', value: 1 },
      { title: 'Manage templates', description: 'Open templates folder in file explorer to manage them', value: 2},
    ],
    initial: 0,
    hint: '- Space to select'
  });

  return response.value;
}

async function promptForUid(message) {
  const response = await prompts({
    type: 'text',
    name: 'value',
    message: message,
    validate: value => value.length < 5 ? "UID too small" : true
  });

  return response.value;
}

async function promtForTemplate(noOfTemplates) {
  const response = await prompts({
    type: 'number',
    name: 'value',
    message: 'Select template',
    intial: 0,
    min: 0,
    max: noOfTemplates - 1
  });

  return response.value;
}

async function promtForInput(message) {
  const response = await prompts({
    type: 'text',
    name: 'value',
    message: message,
  });

  return response.value;
}

async function promtForStringInput(match) {
  const response = await prompts({
    type: 'text',
    name: 'value',
    message: `Enter value for ${match}`,
    validate: value => typeof(value) === 'string' ? true : 'Enter a string'
  });

  return response.value;
}

async function promtForIntInput(match) {
  const response = await prompts({
    type: 'number',
    name: 'value',
    message: `Enter value for ${match}`,
    intial: 0,
    float: true,
    round: 3
  });

  return response.value;
}

// ----- FUNCTIONS -----
function openDir(dir){
  openExplorer(dir, err => {
    if(err) {
      console.log(chalk.red('[-] Error opening directory'));
      if (options.v) {
        console.log(err);
      }
    }
  });
}

function tryWriteFileSync(path, file){
  try {
    fs.writeFileSync(path, file);
  }
  catch(err) {
    console.log(chalk.red('[-] Error writing to file'));
    if (options.v) {
      console.log(err);
    }
  }
}

function tryReadFileSync(path){
  try {
    return fs.readFileSync(path);
  }
  catch(err) {
    console.log(chalk.red('[-] Error reading file'));
    if (options.v) {
      console.log(err);
    }
  }
}

async function handleDashboardJson(json) {
  // Save the json as a file
  let jsonString = JSON.stringify(json);
  const dirPath = path.join(TEMP_DIR, 'temp.json');
  tryWriteFileSync(dirPath, jsonString);

  // Load the dashboard json file to edit
  let jsonFile = editJsonFile(dirPath);

  // Pull out dashboard panel object and get the last grid coordinates
  var jsonPanels = jsonFile.get('dashboard.panels');
  let length = jsonPanels.length;
  let gridPos = jsonPanels[length - 1].gridPos;

  // Load the template and parse as object
  let noOfTemplates = displayTemplates();
  if(noOfTemplates === -1) {return};
  let templateChoice = await promtForTemplate(noOfTemplates);
  let templateName = getTemplateName(templateChoice);
  const templatePath = path.join(TEMPLATES_DIR, `${templateName}.json`);
  let rawTemplate = tryReadFileSync(templatePath); //TODO: Check the template and warn if it doesnt look like grafana json
  var template = JSON.parse(rawTemplate);

  //Give random ID and itterate on the position
  template.id = Date.now();
  template.gridPos.x = gridPos.x + (2 * gridPos.w) > 24 ? 0 : gridPos.x + gridPos.w;
  template.gridPos.y =  gridPos.x + (2 * gridPos.w) > 24 ? gridPos.y + gridPos.h : gridPos.y;

  // Input custom values into template as strings
  var templateString = JSON.stringify(template);
  templateString = await replaceStringVariables(templateString);
  templateString = await replaceIntVariables(templateString);

  // Parse and add the template to the json panels object
  template = JSON.parse(templateString);
  jsonPanels.push(template);

  // Set the updated template into the json file
  jsonFile.set('dashboard.panels', jsonPanels);
  jsonFile.save();
  
  // Upload the new json to grafana
  setDashboardJsonByUid(jsonFile.get("dashboard"));
}

function displayTemplates() { //TODO: This check will fail if theres a non json file in the templates folder
  var i = 0;
  NEWLINE();

  let templateDir = fs.readdirSync(TEMPLATES_DIR);
  if (templateDir.length > 0){
    templateDir.forEach(file => {
      let split = file.split('.');
  
      if(split[1] == 'json'){
        console.log(' ' + i + ': ' + split[0]);
        i++;
      }
    })
  }
  else {
    openDir(TEMPLATES_DIR);
    console.log(chalk.red('[-] Error: No templates detected'));
    return -1;
  }

  NEWLINE();
  return i;
}

async function manageEnvVar(envVar, message, name, envName) {
  if (envVar === undefined || envVar === ''){
    console.log("[-] Error: Not set");
    setEnvVar(message, name, envName);
  } 
  else {
    console.log("Currently set as: " + chalk.green(envVar));
    NEWLINE();
    let response = await promptYesOrNo('Update?');
    if (response === true) {
      setEnvVar(message, name, envName);
    }
    else {
      menuManageVariables();
    }
  }
}

async function replaceStringVariables(jsonString) {
  const regex = /{{\w+}}/g;
  let replace = jsonString;
  let m;

  while ((m = regex.exec(replace)) !== null) {
    for (let i=0; i < m.length; i++) {
      match = m[i];
      let input = await promtForStringInput(match.slice(2, -2));
      jsonString = jsonString.replace(match, input);
    }
  }
   return jsonString;
}

async function replaceIntVariables(jsonString) {
  const regex = /"{i{\w+}}"/g;
  let replace = jsonString;
  let m;

  while ((m = regex.exec(replace)) !== null) {
    for (let i=0; i < m.length; i++) {
      match = m[i];
      let input = await promtForIntInput(match.slice(4, -3));
      jsonString = jsonString.replace(match, input);
    }
  }
  return jsonString;
}
