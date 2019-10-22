#!/usr/bin/env node

// ----- IMPORTS -----
const fs = require('fs'); // File system 
const yargs = require('yargs'); // Command line arguements
const axios = require('axios'); // HTTP Client
const boxen = require('boxen'); // Boxes in terminal
const chalk = require('chalk'); // Terminal string styling
const prompts = require('prompts'); // User promts
const figlet = require('figlet'); // Large text styling
const openExplorer = require('open-file-explorer'); // File explorer
const editJsonFile = require('edit-json-file'); // JSON editor

require('dotenv').config(); // Environment variable

// ----- CONSTANTS -----
const options = yargs.argv; // Get command line options eg: debug
const TEMPLATES_DIR = 'store\\templates';
const TEMP_DIR = 'store\\temp';
const SAVED_DIR = 'store\\saved';
const MENU_SLEEP_TIME = 1500;
const NEWLINE = () => console.log('\n');

// ----- OPENING CODE -----
if (options.init){
  initialise();
} 
else if (process.env.API_KEY === undefined || process.env.API_KEY === '') {
  console.log(chalk.red('[-] Error: GrafPAD not initialised. Please run ' + chalk.yellow('grafpad --init')));
} 
else {
  title();
  setTimeout(menu, 700);
}

// ----- INIT FUNCTION -----
async function initialise(){
  setFolderStructure();
  await setGrafanaUrl();
  await setGrafanaApiKey();
  await setPrometheusConfigLocation();
}

// ----- TITLE AND MENU -----
function title() {
  // Title
  console.log(
    boxen(
      chalk.hex('FF7700')(figlet.textSync("GrafPAD")+"\nGrafana Panel and Dashboard Editing Tool")
      + chalk.yellow('\n-Support for Prometheus and Node-RED-')
      + chalk.magenta('\nv0.1.0 - By mikecbone'), 
      {
        padding: 1, float: 'center', align: 'center', border: 'bold'
      }
    )
  );
}

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
        { title: 'Add gateway to Node-RED', description: 'Add a gateway to Node-RED monitoring', value: 4}, //TODO
        { title: 'Add gateway to Prometheus', description: 'Add a gateway to prometheus scraping', value: 5}, //TODO
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
  let uid = await promptForDashboardUid();

  if (uid === undefined || uid === '') {
    console.log(chalk.red('[-] Error: Undefined UID'));
    return;
  }

  getDashboardJsonByUid(uid, function(returnValue) {
    handleDashboardJson(returnValue);
  })
}

async function menuDashboardJsonByUid(){
  let uid = await promptForDashboardUid();

  if (uid === undefined || uid === '') {
    console.log(chalk.red('[-] Error: Undefined UID'));
    return;
  }

  getDashboardJsonByUid(uid, async function(returnValue) { //TODO: Add an option to save the json locally. 
    console.log(returnValue);

    let response = await promptYesOrNo('Save dashboard JSON?');
    if (response === true) {
      setDashboardJsonToDisk(returnValue);
    }

    setTimeout(menu, MENU_SLEEP_TIME);
  });
}

function menuAddGatewayToNodeRed(){
  setTimeout(menu, MENU_SLEEP_TIME);
}

function menuAddGatewayToPrometheus(){
  setTimeout(menu, MENU_SLEEP_TIME);
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
  if (!fs.existsSync('store')){
    fs.mkdirSync('store');
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
  if (!fs.existsSync('.env')){
    fs.writeFileSync('.env', '');
  }
  if (!fs.existsSync('.gitignore')){
    fs.writeFileSync('.gitignore', '.env\nnode_modules\n');
  }
  console.log(chalk.green('Folder Structure Set\n'));
}

async function setGrafanaUrl(){
  let url = await promtForGrafanaUrl();

  if (url != undefined && url != ''){
    fs.appendFileSync('.env', '\nGRAFANA_URL='+url);
    console.log(chalk.green('Grafana URL Set\n'));
  }
  else {
    console.log(chalk.red('Grafana URL Undefined'));
    process.exit();
  }
}

async function setGrafanaApiKey(){
  let apiKey = await promptForGrafanaApi();

  if (apiKey != undefined && apiKey != ''){
    fs.appendFileSync('.env', '\nAPI_KEY='+apiKey);
    console.log(chalk.green('API Key Set\n'));
  }
  else {
    console.log(chalk.red('API Key Undefined'));
    process.exit();
  }
}

async function setPrometheusConfigLocation(){
  let location = await promtForPrometheusConfigLocation();
  
  if (location != undefined && location != ''){
    fs.appendFileSync('.env', '\nPROMETHEUS_CONFIG='+location);
    console.log(chalk.green('Prometheus Config Location Set\n'));
  }
  else {
    console.log(chalk.red('Prometheus Config Location Undefined'));
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
        'Authorization': 'Bearer ' + process.env.API_KEY
      }
    }
  ).then(res => {
    callback(res.data);
  });
}

async function setDashboardJsonByUid(json){
  const baseUrl = process.env.GRAFANA_URL + "/api/dashboards/db"; //TODO: Get grafana url on init

  axios.post(
    baseUrl, {
      "dashboard": json,
      "folderId": 0,
      "overwrite": true
    }, {
      headers: {
        'Accept': "application/json", 
        'Content-Type': 'application/json', 
        'Authorization': 'Bearer ' + process.env.API_KEY
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

function getTemplateName(templateChoice){ // TODO: THIS WILL BREAK IF THERE ARE NON JSON FILES
  let file = fs.readdirSync(TEMPLATES_DIR)[templateChoice];
  let split = file.split('.');
  return split[0];
}

function setDashboardJsonToDisk(json) {
  fs.writeFileSync(SAVED_DIR + '\\json.json', JSON.stringify(json)); //TODO: These should be in a try catch

  openDir(SAVED_DIR);
}

// ----- PROMPTS -----
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

async function promptForDashboardUid(){
  const response = await prompts({
    type: 'text',
    name: 'value',
    message: 'Enter dashboard UID',
    validate: value => value.length < 5 ? "UID too small" : true
  });

  return response.value;
}

async function promptForGrafanaApi(){
  const response = await prompts({
    type: 'text',
    name: 'value',
    message: 'Enter Grafana API Key',
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

async function promtForGrafanaUrl(){
  const response = await prompts({
    type: 'text',
    name: 'value',
    message: 'Enther Grafana URL (eg: http://localhost:3000)',
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
  var path = __dirname;
  let splits = path.split('bin');
  var path = splits[0] + dir;

  openExplorer(path, err => {
    if(err) {
      console.log(err);
    }
  })
}

async function handleDashboardJson(json){
  // Save the json as a file
  let jsonString = JSON.stringify(json);
  fs.writeFileSync(TEMP_DIR + '\\temp.json', jsonString);

  // Load the dashboard json file to edit
  let jsonFile = editJsonFile(`${TEMP_DIR}\\temp.json`);

  // Pull out dashboard panel object and get the last grid coordinates
  var jsonPanels = jsonFile.get('dashboard.panels');
  let length = jsonPanels.length;
  let gridPos = jsonPanels[length - 1].gridPos

  // Load the template and parse as object
  let noOfTemplates = displayTemplates();
  let templateChoice = await promtForTemplate(noOfTemplates);
  let templateName = getTemplateName(templateChoice);
  let rawTemplate = fs.readFileSync(`${TEMPLATES_DIR}\\${templateName}.json`)
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
  let apiKey = process.env.API_KEY;

  if (apiKey === undefined || apiKey === ''){
    console.log("[-] Error: No grafana key set");
    setGrafanaApiKey();
  } 
  else {
    console.log("Current Grafana API Key: " + chalk.green(apiKey));
    NEWLINE();
    let response = await promptYesOrNo('Change API Key?');
    if (response === true) {
      setGrafanaApiKey();
    }
    else {
      setTimeout(menu, MENU_SLEEP_TIME);
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
      setTimeout(menu, MENU_SLEEP_TIME);
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
      setTimeout(menu, MENU_SLEEP_TIME);
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
 // key: eyJrIjoiTTJWd2dwZkpqYkxhbncyeTU1cmxEU1hOc2tONnBYSTkiLCJuIjoiR3JhZlBBRCIsImlkIjoxfQ==
