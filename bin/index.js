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

require('dotenv').config(); // Enviroment variable

// ----- CONSTANTS -----
const options = yargs.argv; // Get command line options eg: debug
const TEMPLATES_DIR = 'store\\templates';
const TEMP_DIR = 'store\\temp';
const MENU_SLEEP_TIME = 1500;
const NEWLINE = () => console.log('\n');

// ----- OPENING CODE -----
if (options.init){
  initialise();
} 
else if (!fs.existsSync('.env') || process.env.API_KEY === undefined || process.env.API_KEY === '') {
  console.log(chalk.red('[-] Error: GrafPAD not initialised. Please run ' + chalk.yellow('grafpad --init')));
} 
else {
  title();
  setTimeout(menu, 700);
}

// ----- INIT FUNCTION -----
function initialise(){
  console.log(chalk.magenta('Setting up folder structure...'));
  setFolderStructure();
  console.log(chalk.magenta('Getting Grafana API Key...'));
  setGrafanaApiKey();
}

// ----- TITLE AND MENU -----
function title() {
  // Title
  console.log(
    boxen(
      chalk.hex('FF7700')(figlet.textSync(
        "GrafPAD")+"\nGrafana Panel and Dashboard Editing Tool\n-Support for Prometheus and Node-RED-"
      ), 
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
        { title: 'Templates', description: 'Manage Grafana JSON templates', value: 1 },
        { title: 'Panel by UID', description: 'Add a panel from templates to a dashboard by UID', value: 2},
        { title: 'Dashboard JSON by UID', description: 'Retrieve the JSON of a dashboard by UID', value: 3},
        { title: 'Grafana API Key', description: 'Manage grafana api key', value: 4},
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
        menuGrafanaApiKey();
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
    showCurrentTemplates();
  }
  else if (response === 2) {
    addNewTemplate();
  }
}

function menuPanelByUid(){
  setTimeout(menu, MENU_SLEEP_TIME);
}

async function menuDashboardJsonByUid(){
  let uid = await promptForDashboardUid();

  if (uid === undefined || uid === '') {
    console.log(chalk.red('[-] Error: Could  not read API key'));
    return;
  }

  getDashboardJsonByUid(uid, function(returnValue) { //pmr8WlZRk
    // Save the json as a file
    let jsonString = JSON.stringify(returnValue);
    fs.writeFileSync(TEMP_DIR + '\\temp.json', jsonString);

    // Load the json file to edit
    let jsonFile = editJsonFile(`${TEMP_DIR}\\temp.json`);

    // Pull out dashboard panel object and get the last grid coordinates
    var jsonPanels = jsonFile.get('dashboard.panels');
    let length = jsonPanels.length;
    let gridPos = jsonPanels[length - 1].gridPos

    // Load the template and parse as object
    let rawTemplate = fs.readFileSync(TEMPLATES_DIR + '\\template.json');
    var template = JSON.parse(rawTemplate);

    //Give random ID and itterate on the position
    template.id = Date.now();
    template.gridPos.x = gridPos.x + (2 * gridPos.w) > 24 ? 0 : gridPos.x + gridPos.w;
    template.gridPos.y =  gridPos.x + (2 * gridPos.w) > 24 ? gridPos.y + gridPos.h : gridPos.y;

    // Input custom values into template as strings
    var templateString = JSON.stringify(template);
    replaceStringVariables(templateString);
    replaceIntVariables(templateString);
    templateString = templateString.replace("{{MEASUREMENT}}", "Shrike");
    templateString = templateString.replace("{{TITLE}}", "GrafPAD Panel");
    templateString = templateString.replace('"{i{FILL_AMOUNT}}"', 5);
    template = JSON.parse(templateString)

    // Add the template to the json panels object
    jsonPanels.push(template);

    // Set the updated template into the json file
    jsonFile.set('dashboard.panels', jsonPanels);
    jsonFile.save();
    console.log(jsonFile.get("dashboard"));
    
    // Upload the new json to grafana
    setDashboardJsonByUid(jsonFile.get("dashboard"));

    setTimeout(menu, MENU_SLEEP_TIME);
  });
}

async function menuGrafanaApiKey(){
  let apiKey = getGrafanaApiKey();

  if (apiKey === 'NO_API_KEY'){
    console.log("[-] Error: No grafana key set");
    setGrafanaApiKey();
  } 
  else {
    console.log("Current API Key: " + chalk.green(apiKey));
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
  if (!fs.existsSync('.env')){
    fs.writeFileSync('.env');
  }
  if (!fs.existsSync('.gitignore')){
    fs.writeFileSync('.gitignore', '.env\nnode_modules\n');
  }
}

function getGrafanaApiKey() {
  if (process.env.API_KEY != null && process.env.API_KEY != ''){
    return process.env.API_KEY;
  } else {
    return 'NO_API_KEY';
  }
}

async function setGrafanaApiKey(){
  let apiKey = await promptForGrafanaApi();

  if (apiKey != undefined && apiKey != ''){
    fs.writeFileSync('.env', 'API_KEY='+apiKey);
    console.log(chalk.green('API Key Set\n'))
    process.exit();
  }
  else {
    console.log(chalk.red('API Key Undefined'));
    process.exit();
  }
  
}

async function getDashboardJsonByUid(uid, callback){
  const baseUrl = "http://tatooine.local:3000/api/dashboards/uid/";
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
  const baseUrl = "http://tatooine.local:3000/api/dashboards/db";

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
  );
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

// ----- FUNCTIONS -----
function showCurrentTemplates(){
  NEWLINE();
  fs.readdirSync(TEMPLATES_DIR).forEach(file => {
    let split = file.split('.');

    if(split[1] == 'json'){
      console.log(' - ' + split[0]);
    }
  })

  menu();
}

function addNewTemplate(){
  var path = __dirname;
  let splits = path.split('bin');
  var path = splits[0] + TEMPLATES_DIR;

  openExplorer(path, err => {
    if(err) {
      console.log(err);
    }
  })

  menu();
}

function replaceStringVariables(jsonString){
  const regex = /{{\w+}}/g;
  var replace = jsonString;

  let m;

  while ((m = regex.exec(replace)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === regex.lastIndex) {
          regex.lastIndex++;
      }
      
      // The result can be accessed through the `m`-variable.
      m.forEach((match, groupIndex) => {
          console.log(`Found match, group ${groupIndex}: ${match}`);
      });
  }
}

function replaceIntVariables(jsonString){
  const regex = /"{i{\w+}}"/g;
  var replace = jsonString

  let m;

  while ((m = regex.exec(replace)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === regex.lastIndex) {
          regex.lastIndex++;
      }
      
      // The result can be accessed through the `m`-variable.
      m.forEach((match, groupIndex) => {
          console.log(`Found match, group ${groupIndex}: ${match}`);
      });
  }
}

 // uid: ctM1hTWRz 
 // key: eyJrIjoiTTJWd2dwZkpqYkxhbncyeTU1cmxEU1hOc2tONnBYSTkiLCJuIjoiR3JhZlBBRCIsImlkIjoxfQ==
