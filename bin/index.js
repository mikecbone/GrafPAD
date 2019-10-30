#!/usr/bin/env node

// ----- INTERNAL IMPORTS -----
const fs = require('fs'); // File system 
const {exec} = require('child_process'); // Command line
const path = require('path'); // Cross platform path tool

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

// ----- CONSTANTS -----
const options = yargs.argv; // Get command line options eg: debug
const dirPath = __dirname.split('bin')[0];
const MENU_SLEEP_TIME = 1500;
const NEWLINE = () => console.log('\n');

const STORE_DIR = path.join(dirPath, 'store')
const ENV_FILE = path.join(dirPath, '.env');
const GIT_FILE = path.join(dirPath, '.gitignore');
const TEMPLATES_DIR = path.join(STORE_DIR, 'templates');
const TEMP_DIR = path.join(STORE_DIR, 'temp');
const SAVED_DIR = path.join(STORE_DIR, 'saved');

require('dotenv').config({path: ENV_FILE});

// ----- OPENING CODE -----
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
async function initialise(){
  setFolderStructure();
  await setGrafanaUrl();
  await setGrafanaApiKey();
  await setPrometheusConfigLocation();
  await setPrometheusUrl();
  await setNodeRedUrl();
  await setNodeRedApiKey();
  fs.appendFileSync(ENV_FILE, '\nINIT=true');
}

/**
 * Show the title box
 */
function title() {
  // Title
  console.log(
    boxen(
      chalk.hex('FF7700')(figlet.textSync("GrafPAD")+"\nGrafana Panel and Dashboard Editing Tool")
      + chalk.yellow('\n- Support for Prometheus and Node-RED -')
      + chalk.magenta('\nv0.1.0 - the Red Dev Team'), 
      {
        padding: 1, float: 'center', align: 'center', border: 'bold'
      }
    )
  );
}

/**
 * Show the main menu
 */
async function menu(){
  NEWLINE();
  (async () => {
    const response = await prompts({
      type: 'select',
      name: 'value',
      message: 'Menu',
      choices: [
        { title: 'Manage templates', description: 'Manage Grafana JSON templates', value: 1 },
        { title: 'Add panel by UID', description: 'Add a panel from templates to a dashboard by UID', value: 2},
        { title: 'Get dashboard JSON by UID', description: 'Retrieve the JSON of a dashboard by UID', value: 3},
        { title: 'Add target to Node-RED', description: 'Add a target to Node-RED monitoring', value: 4}, //TODO
        { title: 'Add target to Prometheus', description: 'Add a scraping target to prometheus', value: 5},
        { title: 'Manage Initialised Variables', description: 'Manage environment variables setup at initialisation', value: 6},
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
        menuTemplates();
        break;
      case 2:
        menuPanelByUid();
        break;
      case 3:
        menuDashboardJsonByUid();
        break;
      case 4:
        menuAddGatewayToNodeRed();
        break;
      case 5:
        menuAddGatewayToPrometheus();
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
async function menuTemplates(){
  let response = await promptShowOrAddTemplates();

  if(response === 1) {
    displayTemplates();
    setTimeout(menu, MENU_SLEEP_TIME);
  }
  else if (response === 2) {
    addNewTemplate();
  }
}

async function menuPanelByUid(){
  let uid = await promptForUid('Enter dashboard UID');

  if (uid === undefined || uid === '') {
    console.log(chalk.red('[-] Error: Undefined UID'));
    return;
  }

  getDashboardJsonByUid(uid, function(returnValue) {
    handleDashboardJson(returnValue);
  })
}

async function menuDashboardJsonByUid(){
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

async function menuAddGatewayToNodeRed(){
  let uid = await promptForUid('Enter flow UID');
  const url = process.env.NODERED_URL + '/flow/' + uid; //96cab97e.c658f8

  let config = {
    headers: {
      'Accept': "application/json", 
      'Content-Type': 'application/json',
    }
  }

  // Add API key header if available
  process.env.NODERED_API_KEY ? headers.Authorization = 'Bearer ' + process.env.NODE_API_KEY : null;

  axios.get(
    url, config
  ).then(async res => {
    if(res.status === 200){
      NEWLINE();
      console.log(`${res.status}: ${res.statusText}`);
      console.log(chalk.green('Successfully got Node-RED active flows configuration'));

      // Save the downloaded flow file 
      const dirPath = path.join(TEMP_DIR, 'nodered_flows.json');
      fs.writeFileSync(dirPath, JSON.stringify(res.data));

      // Load the dashboard json file to edit
      let jsonFile = editJsonFile(dirPath);

      // Pull out the nodes, flowid and final node x and y position
      var jsonNodes = jsonFile.get('nodes');
      const flowid = jsonFile.get('id');
      const lastX = jsonNodes[jsonNodes.length - 1].x
      const lastY = jsonNodes[jsonNodes.length - 1].y

      // Load the template and parse as object TODO: This code is repeated
      let noOfTemplates = displayTemplates();
      let templateChoice = await promtForTemplate(noOfTemplates);
      let templateName = getTemplateName(templateChoice);
      const templatePath = path.join(TEMPLATES_DIR, `${templateName}.json`);
      let rawTemplate = fs.readFileSync(templatePath) //TODO: Check the template and warn if it doesnt look like node red json
      var template = JSON.parse(rawTemplate);

      // Input custom values into template as strings
      var templateString = JSON.stringify(template);
      templateString = await replaceStringVariables(templateString);
      templateString = await replaceIntVariables(templateString);

      // Parse and add the template to the json flow nodes object
      template = JSON.parse(templateString)
      let length = template.length;
      for(let i=0; i < length; i++) {
        template[i].id = flowid;
        template[i].x = lastX + 10 + (i * 10);
        template[i].y = lastY + 10 + (i * 10);
        jsonNodes.push(template[i])
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
      console.log(chalk.red('Error contacting Node-RED'));
    }
  });
}

function menuAddGatewayToPrometheus(){
  const url = process.env.PROMETHEUS_URL + "/api/v1/status/config";

  axios.get(url).then(async res => {
    if(res.status === 200){
      NEWLINE();
      console.log(`${res.status}: ${res.statusText}`);
      console.log(chalk.green('Successfully got config file'));

      // Save the downloaded config file and open it in yaml module
      const dirPath = path.join(TEMP_DIR, 'prometheus_config.yml');
      fs.writeFileSync(dirPath, res.data.data.yaml);
      let doc = yaml.safeLoad(fs.readFileSync(dirPath));
      console.log(doc);

      // Loop through configs to add gateway to
      for (let i=0; i<doc.scrape_configs.length; i++){
        const name = doc.scrape_configs[i].job_name;
        let response = await promptYesOrNo(`Add gateway target to job: ${name}`);
        if (response === true){
          doc.scrape_configs[i].static_configs[0].targets.push('shrike.ttnliv.uk:8105');
          console.log(chalk.green('Added shrike.ttnliv.uk:8105 to ' + name));
        }
      }

      // Save the new yaml file
      fs.writeFileSync(dirPath, yaml.safeDump(doc)); //TODO back up the old one

      exec('sudo service prometheus restart', (err, stdout, stderr) => { //TODO restart prometheus
        if (err) {
          //console.log(err);
          console.log(chalk.red('[-] Error: Cannot restart Prometheus'));
          return;
        }

        console.log(stdout);
        console.log(stderr);
      });

      setTimeout(menu, MENU_SLEEP_TIME);
    }
    else {
      NEWLINE();
      console.log(`${res.status}: ${res.statusText}`);
      console.log(chalk.red('Error contacting prometheus'));
    }
  });
}

async function menuManageVariables(){
  let response = await promtManageVariables();

  switch (response)
    {
      case 1:
        grafanaUrl();
        break;
      case 2:
        grafanaApiKey();
        break;
      case 3:
        prometheusConfig();
        break;
      case 4:
        prometheusUrl();
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

function exitApp(){
  process.exit();
}

// ----- SET AND GETS -----
function setFolderStructure(){
  if (!fs.existsSync(STORE_DIR)){
    fs.mkdirSync(STORE_DIR);
  }
  if (!fs.existsSync(TEMPLATES_DIR)){
    fs.mkdirSync(TEMPLATES_DIR);
  }
  if (!fs.existsSync(TEMP_DIR)){
    fs.mkdirSync(TEMP_DIR);
  }
  if (!fs.existsSync(SAVED_DIR)){
    fs.mkdirSync(SAVED_DIR);
  }
  if (!fs.existsSync(GIT_FILE)){
    fs.writeFileSync(GIT_FILE, '.env\nnode_modules\nstore/temp\n.DS_Store\n');
  }
  fs.writeFileSync(ENV_FILE, '');
  console.log(chalk.green('Folder Structure Set\n'));
}

async function setGrafanaUrl(){
  let url = await promtForUrl('Enther Grafana URL (eg: http://localhost:3000)');

  if (url != undefined && url != ''){
    fs.appendFileSync(ENV_FILE, '\nGRAFANA_URL='+url);
    console.log(chalk.green('Grafana URL Set\n'));
  }
  else {
    console.log(chalk.red('Grafana URL Undefined'));
    process.exit();
  }
}

async function setGrafanaApiKey(){
  let apiKey = await promptForApi('Enter Grafana API Key');

  if (apiKey != undefined && apiKey != ''){
    fs.appendFileSync(ENV_FILE, '\nGRAFANA_API_KEY='+apiKey);
    console.log(chalk.green('Grafana API Key Set\n'));
  }
  else {
    console.log(chalk.red('Grafana API Key Undefined'));
    process.exit();
  }
}
async function setNodeRedUrl(){
  let url = await promtForUrl('Enther Node-RED URL (eg: http://localhost:1880)');

  if (url != undefined && url != ''){
    fs.appendFileSync(ENV_FILE, '\nNODERED_URL='+url);
    console.log(chalk.green('Node-RED URL Set\n'));
  }
  else {
    console.log(chalk.red('Node-RED URL Undefined'));
    process.exit();
  }
}

async function setNodeRedApiKey(){
  let apiKey = await promptForApi('Enter Node-RED API Key');

  if (apiKey != undefined && apiKey != ''){
    fs.appendFileSync(ENV_FILE, '\nNODERED_API_KEY='+apiKey);
    console.log(chalk.green('Node-RED API Key Set\n'));
  }
  else {
    console.log(chalk.red('Node-RED API Key Undefined'));
    process.exit();
  }
}

async function setPrometheusConfigLocation(){
  let location = await promtForPrometheusConfigLocation();
  
  if (location != undefined && location != ''){
    fs.appendFileSync(ENV_FILE, '\nPROMETHEUS_CONFIG='+location);
    console.log(chalk.green('Prometheus Config Location Set\n'));
  }
  else {
    console.log(chalk.red('Prometheus Config Location Undefined'));
    process.exit();
  }
}

async function setPrometheusUrl(){
  let location = await promtForUrl('Enther Prometheus URL (eg: http://localhost:9090)');
  
  if (location != undefined && location != ''){
    fs.appendFileSync(ENV_FILE, '\nPROMETHEUS_URL='+location);
    console.log(chalk.green('Prometheus URL Set\n'));
  }
  else {
    console.log(chalk.red('Prometheus URL Undefined'));
    process.exit();
  }
}

async function getDashboardJsonByUid(uid, callback){
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
  });
}

async function setDashboardJsonByUid(json){
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
      console.log(chalk.red('Error posting to Grafana'));
    }
  });

  setTimeout(menu, MENU_SLEEP_TIME);
}

async function setNoderedFlowByUid(json, uid){
  const url = process.env.NODERED_URL + '/flow/' + uid;

  let config = {
    headers: {
      'Accept': "application/json", 
      'Content-Type': 'application/json',
    }
  }

  // Add API key header if available
  process.env.NODERED_API ? headers.Authorization = 'Bearer ' + process.env.NODE_API_KEY : null;

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
      console.log(chalk.red('Error posting to Node-RED'));
    }
  });

  setTimeout(menu, MENU_SLEEP_TIME);
}

function getTemplateName(templateChoice){ // TODO: THIS WILL BREAK IF THERE ARE NON JSON FILES
  let file = fs.readdirSync(TEMPLATES_DIR)[templateChoice];
  let split = file.split('.');
  return split[0];
}

function setDashboardJsonToDisk(json) {
  const dirPath = path.join(SAVED_DIR, 'json.json');
  fs.writeFileSync(dirPath, JSON.stringify(json)); //TODO: These should be in a try catch

  openDir(SAVED_DIR);
}

// ----- PROMPTS ----- TODO: Do all text promts need to be different
async function promptYesOrNo(message){
  const response = await prompts({
    type: 'confirm',
    name: 'value',
    message: message,
    initial: false,
  });

  return response.value;
}

async function promtManageVariables(){
  const response = await prompts({
    type: 'select',
    name: 'value',
    message: 'Environment Variables',
    choices: [
      { title: 'Grafana URL', description: 'Manage the Grafana URL', value: 1 },
      { title: 'Grafana API Key', description: 'Manage the Grafana API key', value: 2},
      { title: 'Prometheus Config', description: 'Manage the Prometheus config file location', value: 3},
      { title: 'Prometheus URL', description: 'Manage the Prometheus URL', value: 4},
      { title: 'Main Menu', description: 'Go back to the main menu', value: 99},
    ],
    initial: 0,
    hint: '- Space to select'
  });

  return response.value;
}

async function promptShowOrAddTemplates(){
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

async function promptForUid(message){
  const response = await prompts({
    type: 'text',
    name: 'value',
    message: message,
    validate: value => value.length < 5 ? "UID too small" : true
  });

  return response.value;
}

async function promptForApi(message){
  const response = await prompts({
    type: 'text',
    name: 'value',
    message: message,
    validate: value => value.length < 50 ? "API key too small" : true
  });

  return response.value;
}

async function promtForTemplate(noOfTemplates){
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

async function promtForPrometheusConfigLocation(){
  const response = await prompts({
    type: 'text',
    name: 'value',
    message: 'Enther Prometheus config file location (eg: /etc/prometheus/prometheus.yml)',
  });

  return response.value;
}

async function promtForUrl(message){
  const response = await prompts({
    type: 'text',
    name: 'value',
    message: message,
    validate: value => value.length < 10 ? "URL is too small" : true
  });

  return response.value;
}

async function promtForStringInput(match){
  const response = await prompts({
    type: 'text',
    name: 'value',
    message: `Enter value for ${match}`,
    validate: value => typeof(value) === 'string' ? true : 'Enter a string'
  });

  return response.value;
}

async function promtForIntInput(match){
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
function addNewTemplate(){
  openDir(TEMPLATES_DIR);

  setTimeout(menu, MENU_SLEEP_TIME);
}

function openDir(dir){
  var dirPath = __dirname;
  let splits = dirPath.split('bin');
  var dirPath = splits[0] + dir;

  openExplorer(dirPath, err => {
    if(err) {
      console.log(err);
    }
  })
}

async function handleDashboardJson(json){
  // Save the json as a file
  let jsonString = JSON.stringify(json);
  const dirPath = path.join(TEMP_DIR, 'temp.json');
  fs.writeFileSync(dirPath, jsonString);

  // Load the dashboard json file to edit
  let jsonFile = editJsonFile(dirPath);

  // Pull out dashboard panel object and get the last grid coordinates
  var jsonPanels = jsonFile.get('dashboard.panels');
  let length = jsonPanels.length;
  let gridPos = jsonPanels[length - 1].gridPos

  // Load the template and parse as object
  let noOfTemplates = displayTemplates();
  let templateChoice = await promtForTemplate(noOfTemplates);
  let templateName = getTemplateName(templateChoice);
  const templatePath = path.join(TEMPLATES_DIR, `${templateName}.json`);
  let rawTemplate = fs.readFileSync(templatePath) //TODO: Check the template and warn if it doesnt look like grafana json
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
  template = JSON.parse(templateString)
  jsonPanels.push(template);

  // Set the updated template into the json file
  jsonFile.set('dashboard.panels', jsonPanels);
  jsonFile.save();
  
  // Upload the new json to grafana
  setDashboardJsonByUid(jsonFile.get("dashboard"));
}

function displayTemplates(){
  var i = 0;
  NEWLINE();

  fs.readdirSync(TEMPLATES_DIR).forEach(file => {
    let split = file.split('.');

    if(split[1] == 'json'){
      console.log(' ' + i + ': ' + split[0]);
    }

    i++;
  })

  NEWLINE();
  return i;
}

async function grafanaApiKey(){
  let apiKey = process.env.GRAFANA_API_KEY;

  if (apiKey === undefined || apiKey === ''){
    console.log("[-] Error: No grafana key API set");
    setGrafanaApiKey();
  } 
  else {
    console.log("Current Grafana API Key: " + chalk.green(apiKey));
    NEWLINE();
    let response = await promptYesOrNo('Change Grafana API Key?');
    if (response === true) {
      setGrafanaApiKey();
    }
    else {
      menuManageVariables();
    }
  }
}

async function grafanaUrl(){
  let grafanaUrl = process.env.GRAFANA_URL;

  if (grafanaUrl === undefined || grafanaUrl === ''){
    console.log("[-] Error: No grafana URL set");
    setGrafanaUrl();
  } 
  else {
    console.log("Current Grafana URL: " + chalk.green(grafanaUrl));
    NEWLINE();
    let response = await promptYesOrNo('Change URL?');
    if (response === true) {
      setGrafanaUrl();
    }
    else {
      menuManageVariables();
    }
  }
}

async function prometheusConfig(){
  let prometheusConfig = process.env.PROMETHEUS_CONFIG;

  if (prometheusConfig === undefined || prometheusConfig === ''){
    console.log("[-] Error: No prometheus config location set");
    setPrometheusConfigLocation();
  } 
  else {
    console.log("Current Prometheus Config Location: " + chalk.green(prometheusConfig));
    NEWLINE();
    let response = await promptYesOrNo('Change Location?');
    if (response === true) {
      setPrometheusConfigLocation();
    }
    else {
      menuManageVariables();
    }
  }
}

async function prometheusUrl(){
  let prometheusUrl = process.env.PROMETHEUS_URL;

  if (prometheusUrl === undefined || prometheusUrl === ''){
    console.log("[-] Error: No prometheus URL set");
    setPrometheusUrl();
  } 
  else {
    console.log("Current Prometheus URL: " + chalk.green(prometheusUrl));
    NEWLINE();
    let response = await promptYesOrNo('Change URL?');
    if (response === true) {
      setPrometheusUrl();
    }
    else {
      menuManageVariables();
    }
  }
}

async function replaceStringVariables(jsonString){
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

async function replaceIntVariables(jsonString){
  const regex = /"{i{\w+}}"/g;
  let replace = jsonString
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

 // uid: pmr8WlZRk 

 // init:
 // http://tatooine.local:3000
 // eyJrIjoiTTJWd2dwZkpqYkxhbncyeTU1cmxEU1hOc2tONnBYSTkiLCJuIjoiR3JhZlBBRCIsImlkIjoxfQ==
 // /etc/prometheus/prometheus.yml
 // http://tatooine.local:9090
 // http://tatooine.local:1880
 // somerandomapikeybecausewedonthaveoneyetasnoderedisntsettoneedone
