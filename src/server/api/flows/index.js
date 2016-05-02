import {config} from '../../config/app-config';
import {DBService} from '../../common/db.service';
import {isJson, flogoIDEncode, flogoIDDecode, flogoGenTaskID} from '../../common/utils';
import _ from 'lodash';

let basePath = config.app.basePath;
let dbDefaultName = config.db;
let _dbService = new DBService(dbDefaultName);
let FLOW = 'flows';
let DELIMITER = ":";
let DEFAULT_USER_ID = 'flogoweb-admin';

function getAllFlows(){
  let options = {
    include_docs: true,
    startKey: `${FLOW}${DELIMITER}${DEFAULT_USER_ID}${DELIMITER}`,
    endKey: `${FLOW}${DELIMITER}${DEFAULT_USER_ID}${DELIMITER}\uffff`
  };

  return new Promise((resolve, reject)=>{
    _dbService.db.allDocs(options).then((response)=>{
      let allFlows = [];
      let rows = response&&response.rows||[];
      rows.forEach((item)=>{
        // if this item's tabel is FLOW
        if(item&&item.doc&&item.doc.$table === FLOW){
          allFlows.push(item.doc);
        }
      });
      resolve(allFlows);
      // console.log(allFlows);
      //this.body = allFlows;
    }).catch((err)=>{
      reject(err);
    });
  });
}

function createFlow(flowObj){
  return new Promise((resolve, reject)=>{
    _dbService.create(flowObj).then((response)=>{
      resolve(response);
    }).catch((err)=>{
      reject(err);
    });
  });
}

export function flows(app, router){
  if(!app){
    console.error("[Error][api/activities/index.js]You must pass app");
  }

  router.get(basePath+"/flows", getFlows);
  router.post(basePath+"/flows", createFlows);
  router.delete(basePath+"/flows", deleteFlows);

  // {
  //   name: "tibco-mqtt"
  // }
  router.post(basePath+"/flows/trigger", addTrigger);
  router.post(basePath+"/flows/activity", addActivity);
}

function* getFlows(next){
  console.log("getFlows, next: ", next);
  //this.body = 'getFlows';

  //yield next;
  let data = yield getAllFlows();
  console.log(data);
  this.body = data;
}

function* createFlows(next){
  console.log("createFlows");
  try{
    let data = this.request.body||{};
    if(typeof this.request.body == 'string'){
      if(isJson(this.request.body)){
        data = JSON.parse(this.request.body);
      }
    }
    let flowObj = {};
    flowObj.name = data.name||"";
    flowObj.description = data.description || "";
    flowObj._id = _dbService.generateFlowID();
    flowObj.$table = _dbService.getIdentifier("FLOW");
    flowObj.paths = {};
    flowObj.items = {};
    console.log(flowObj);
    let res = yield createFlow(flowObj);
    this.body = res;

    throw new Error("test error");
  }catch(err){
    var error = {
      code: 500,
      message: err.message
    };
    this.body = error;
  }
}

function* deleteFlows(next){
  console.log("deleteFlows");
  this.body = 'deleteFlows';
  yield next;
}

function * addTrigger(next){
  console.log("addTrigger");
  this.body = 'addTrigger';
  yield next;
}

function * addActivity(next){
  console.log("addActivity");
  this.body = 'addActivity';
  yield next;
}
