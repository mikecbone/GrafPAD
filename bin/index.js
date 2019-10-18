#!/usr/bin/env node

// ----- IMPORTS -----
const yargs = require("yargs"); // Command line arguements
const axios = require("axios"); // HTTP Client
const boxen = require('boxen'); // Boxes in terminal
const chalk = require('chalk'); // Terminal string styling
const prompts = require('prompts'); // User promts
const figlet = require('figlet'); // Large text styling
const fs = require('fs'); // File system 
const openExplorer = require('open-file-explorer'); // File explorer

require('dotenv').config(); // Enviroment variable

// ----- CONSTANTS -----
const options = yargs.argv; // Get command line options eg: debug
const TEMPLATES_DIR = 'store\\templates';
const MENU_SLEEP_TIME = 1500;
const NEWLINE = () => console.log('\n');

// ----- OPENING CODE -----
if (options.init){ // Init if requested
  initialise();
} 
else if (1 > 2) { // Check init has been ran

} 
else { // Run the program
  title();
  setTimeout(menu, 700);
}

// ----- INIT FUNCTION -----
function initialise(){
  setFolderStructure();
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
  getDashboardJsonByUid(uid, function(returnValue) {
    console.log(returnValue);
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
  if (!fs.existsSync('.env')){
    fs.writeFileSync('.env');
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

  fs.writeFileSync('.env', 'API_KEY='+apiKey);
  console.log(chalk.green('API Key Set\n'))
  process.exit();
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

// ----- PROMPTS -----
async function promptYesOrNo(message){
  const response = await prompts({
    type: 'toggle',
    name: 'value',
    message: message,
    initial: false,
    active: 'yes',
    inactive: 'no'
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

 // uid: ctM1hTWRz 
 // key: eyJrIjoiTTJWd2dwZkpqYkxhbncyeTU1cmxEU1hOc2tONnBYSTkiLCJuIjoiR3JhZlBBRCIsImlkIjoxfQ==
