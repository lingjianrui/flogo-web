import { Component } from 'angular2/core';
import { RouteConfig, RouterOutlet, RouteParams, Router } from 'angular2/router';
import {PostService} from '../../../common/services/post.service';
import { FlogoFlowsDetailDiagramComponent } from '../../flogo.flows.detail.diagram/components';
import {FlogoFlowsDetail} from './flow-detail.component';
import {FlogoFlowsDetailTriggers} from '../../flogo.flows.detail.triggers/components/triggers.component';
import {FlogoFlowsDetailTriggersDetail} from '../../flogo.flows.detail.triggers.detail/components/detail.component';
import {FlogoFlowsDetailTasks} from '../../flogo.flows.detail.tasks/components/tasks.component';
import {FlogoFlowsDetailTasksDetail} from '../../flogo.flows.detail.tasks.detail/components/detail.component';
import {TransformComponent as FlogoTransformComponent} from '../../flogo.transform/components/transform.component';

import {
  IFlogoFlowDiagramTaskDictionary,
  IFlogoFlowDiagram
} from '../../../common/models';

import { SUB_EVENTS as FLOGO_DIAGRAM_PUB_EVENTS, PUB_EVENTS as FLOGO_DIAGRAM_SUB_EVENTS } from '../../flogo.flows.detail.diagram/messages';

import { SUB_EVENTS as FLOGO_TRIGGERS_PUB_EVENTS, PUB_EVENTS as FLOGO_TRIGGERS_SUB_EVENTS } from '../../flogo.flows.detail.triggers/messages';

import { SUB_EVENTS as FLOGO_ADD_TASKS_PUB_EVENTS, PUB_EVENTS as FLOGO_ADD_TASKS_SUB_EVENTS } from '../../flogo.flows.detail.tasks/messages';

import { SUB_EVENTS as FLOGO_SELECT_TASKS_PUB_EVENTS, PUB_EVENTS as FLOGO_SELECT_TASKS_SUB_EVENTS } from '../../flogo.flows.detail.tasks.detail/messages';

import {PUB_EVENTS as FLOGO_TASK_SUB_EVENTS, SUB_EVENTS as FLOGO_TASK_PUB_EVENTS } from '../../flogo.form-builder/messages'

import { PUB_EVENTS as FLOGO_TRANSFORM_SUB_EVENTS, SUB_EVENTS as FLOGO_TRANSFORM_PUB_EVENTS } from '../../flogo.transform/messages';

import { RESTAPIService } from '../../../common/services/rest-api.service';
import { RESTAPIFlowsService } from '../../../common/services/restapi/flows-api.service';
import { FlogoFlowDiagram } from '../../flogo.flows.detail.diagram/models/diagram.model';
import { FLOGO_TASK_TYPE, FLOGO_TASK_STATUS, FLOGO_FLOW_DIAGRAM_NODE_TYPE } from '../../../common/constants';
import { flogoIDDecode, flogoIDEncode, flogoGenTaskID, normalizeTaskName } from '../../../common/utils';

import {Contenteditable} from '../../../common/directives/contenteditable.directive';

@Component( {
  selector: 'flogo-canvas',
  moduleId: module.id,
  directives: [ RouterOutlet, FlogoFlowsDetailDiagramComponent, FlogoTransformComponent, Contenteditable ],
  templateUrl: 'canvas.tpl.html',
  styleUrls: [ 'canvas.component.css' ]
} )

@RouteConfig([
  {path:'/',    name: 'FlogoFlowsDetailDefault',   component: FlogoFlowsDetail, useAsDefault: true},
  {path:'/trigger/add',    name: 'FlogoFlowsDetailTriggerAdd',   component: FlogoFlowsDetailTriggers},
  {path:'/trigger/:id',    name: 'FlogoFlowsDetailTriggerDetail',   component: FlogoFlowsDetailTriggersDetail},
  {path:'/task/add',    name: 'FlogoFlowsDetailTaskAdd',   component: FlogoFlowsDetailTasks},
  {path:'/task/:id',    name: 'FlogoFlowsDetailTaskDetail',   component: FlogoFlowsDetailTasksDetail}
])

export class FlogoCanvasComponent {
  _subscriptions : any[];

  _currentProcessID: string;
  _isCurrentProcessDirty = true;
  _hasUploadedProcess: boolean;
  _uploadingProcess: boolean;
  _startingProcess: boolean;
  _restartingProcess: boolean;
  _steps: any;
  _processInstanceID: string;
  _restartProcessInstanceID: string;
  _isDiagramEdited:boolean;

  // TODO
  //  may need better implementation
  _lastProcessInstanceFromBeginning : any;

  // TODO
  //  Remove this mock
  _mockLoading = true;
  _mockGettingStepsProcess: boolean;
  _mockProcess: any;

  private initSubscribe() {
    this._subscriptions = [];

    let subs = [
      _.assign( {}, FLOGO_DIAGRAM_SUB_EVENTS.addTask, { callback : this._addTaskFromDiagram.bind( this ) } ),
      _.assign( {}, FLOGO_DIAGRAM_SUB_EVENTS.addTrigger, { callback : this._addTriggerFromDiagram.bind( this ) } ),
      _.assign( {}, FLOGO_DIAGRAM_SUB_EVENTS.selectTask, { callback : this._selectTaskFromDiagram.bind( this ) } ),
      _.assign( {}, FLOGO_DIAGRAM_SUB_EVENTS.deleteTask, { callback : this._deleteTaskFromDiagram.bind( this ) } ),
      _.assign( {}, FLOGO_DIAGRAM_SUB_EVENTS.addBranch, { callback : this._addBranchFromDiagram.bind( this ) } ),
      _.assign( {}, FLOGO_DIAGRAM_SUB_EVENTS.selectBranch, { callback : this._selectBranchFromDiagram.bind( this ) } ),
      _.assign( {}, FLOGO_DIAGRAM_SUB_EVENTS.selectTransform, { callback : this._selectTransformFromDiagram.bind( this ) } ),
      _.assign( {}, FLOGO_DIAGRAM_SUB_EVENTS.selectTrigger, { callback : this._selectTriggerFromDiagram.bind( this ) } ),
      _.assign( {}, FLOGO_TRIGGERS_SUB_EVENTS.addTrigger, { callback : this._addTriggerFromTriggers.bind( this ) } ),
      _.assign( {}, FLOGO_ADD_TASKS_SUB_EVENTS.addTask, { callback : this._addTaskFromTasks.bind( this ) } ),
      _.assign( {}, FLOGO_SELECT_TASKS_SUB_EVENTS.selectTask, { callback : this._selectTaskFromTasks.bind( this ) } ),
      _.assign( {}, FLOGO_TASK_SUB_EVENTS.runFromThisTile, { callback : this._runFromThisTile.bind( this ) } ),
      _.assign( {}, FLOGO_TRANSFORM_SUB_EVENTS.saveTransform, { callback : this._saveTransformFromTransform.bind( this ) } ),
      _.assign( {}, FLOGO_TRANSFORM_SUB_EVENTS.deleteTransform, { callback : this._deleteTransformFromTransform.bind( this ) } )
    ];

    _.each(
      subs, sub => {
        this._subscriptions.push( this._postService.subscribe( sub ) );
      }
    );
  }

  ngOnDestroy() {
    _.each( this._subscriptions, sub => {
        this._postService.unsubscribe( sub );
      }
    );
  }

  private tasks: IFlogoFlowDiagramTaskDictionary;
  private diagram: IFlogoFlowDiagram;
  private _flow: any;

  constructor(
    private _postService: PostService,
    private _restAPIService: RESTAPIService,
    private _restAPIFlowsService: RESTAPIFlowsService,
    private _routerParams: RouteParams,
    private _router: Router
  ) {
    this._hasUploadedProcess = false ;
    this._isDiagramEdited = false;

    // TODO
    //  Remove this mock
    this._mockLoading = true;

    //  get the flow by ID
    let id = '' + this._routerParams.params[ 'id' ];

    try {
      id = flogoIDDecode( id );
    } catch ( e ) {
      console.warn( e );
    }

    this._restAPIFlowsService.getFlow(id)
      .then(
        ( rsp : any )=> {

          if ( !_.isEmpty( rsp ) ) {
            // initialisation
            console.group( 'Initialise canvas component' );

            this._flow = rsp;

            this.tasks = this._flow.items;
            if ( _.isEmpty( this._flow.paths ) ) {
              this.diagram = this._flow.paths = <IFlogoFlowDiagram>{
                root : {},
                nodes : {}
              };
            } else {
              this.diagram = this._flow.paths;
            }

            this.clearTaskRunStatus();

            this.initSubscribe();

            console.groupEnd();

            return this._updateFlow( this._flow );
          } else {
            return this._flow;
          }
        }
      )
      .then(
        ()=> {
          this._mockLoading = false;
        }
      )
      .catch(
        ( err : any )=> {
          if ( err.status === 404 ) {

            this._router.navigate(['FlogoFlows']);

          } else {
            return err;
          }
        }
      );
  }

  isOnDefaultRoute() {
    return this._router.isRouteActive(this._router.generate(['FlogoFlowsDetailDefault']));
  }

  private changeFlowDetail($event, property) {
    return new Promise((resolve, reject)=>{
      this._updateFlow(this._flow).then((response)=>{
        console.log(`update flow's ${property} successful`, response);
        resolve(response);
      }).catch((err)=>{
        console.log(`update flow's ${property} error`, err, true);
        reject(err);
      });
    })
  }

  // TODO
  //  Remove this mock later
  private _updateMockProcess() {
    if ( !_.isEmpty( this._flow ) ) {
      this._restAPIFlowsService.getFlows()
        .then(
          ( rsp : any ) => {
            this._mockProcess = _.find( rsp, { _id : this._flow._id } );
            this._mockProcess = _.assign(
              new FlogoFlowDiagram( this._mockProcess.paths, this._mockProcess.items ).toProcess(), { id : flogoIDEncode( this._flow._id ) }
            );
          }
        );
    }
  }

  private _runFromTrigger() {
    this._isDiagramEdited = false;

    if ( this._isCurrentProcessDirty ) {

      return this.uploadProcess()
        .then(
          ( rsp : any ) => {
            if ( !_.isEmpty( rsp ) ) {
              return this.startAndMonitorProcess( rsp.id );
            } else {
              // the process isn't changed
              return this.startAndMonitorProcess( this._currentProcessID );
            }
          }
        )
        .then(
          () => {
            // TODO
            //  this is just mock implementation to see the steps result
            return this.mockGetSteps();
          }
        );
    } else {

      return this.startAndMonitorProcess( this._currentProcessID )
        .then(
          () => {
            // TODO
            //  this is just mock implementation to see the steps result
            return this.mockGetSteps();
          }
        );

    }

  }

  private _updateFlow( flow : any ) {
    this._isCurrentProcessDirty = true;

    // processing this._flow to pure JSON object
    flow = _.cloneDeep( flow );
    _.each(
      _.keys( flow.paths ), ( key : string ) => {
        if ( key !== 'root' && key !== 'nodes' ) {
          delete flow.paths[ key ];
        }
      }
    );
    flow = JSON.parse( JSON.stringify( flow ) );

    return this._restAPIFlowsService.updateFlow( flow )
      .then(
        ( rsp : any ) => {
          console.log( rsp );
        }
      )
      .then(
        () => {
          // TODO
          //  remove this mock
          return this._updateMockProcess();
        }
      );
  }

  uploadProcess() {
    this._uploadingProcess = true;

    // generate process based on the current flow
    // TODO
    //    since the same process ID returns 204 No Content response, attach timestamp to the ID.
    let process = _.assign(
      new FlogoFlowDiagram( this._flow.paths, this._flow.items ).toProcess(), { id : flogoIDEncode( `${this._flow._id}:${Date.now()}`) }
    );

    return this._restAPIFlowsService.uploadFlow( process ).then((rsp:any) => {
      this._uploadingProcess = false;
      this._hasUploadedProcess = true;
      if ( !_.isEmpty( rsp ) ) {
        this._currentProcessID = rsp.id;
        this._isCurrentProcessDirty = false;
      }

      return rsp;
    });
  }

  startProcess( id? : string ) {
    this._startingProcess = true;
    this._steps = null;

    return this._restAPIFlowsService.startFlow(
        id || this._currentProcessID, {
          // "petId" : "20160222230266"
        }
      )
      .then(
        ( rsp : any )=> {
          this._startingProcess = false;
          this._processInstanceID = rsp.id;

          return rsp;
        }
      )
      .then(
        ( rsp : any ) => {
          console.log( rsp );

          return rsp;
        }
      )
      .catch(
        ( err : any )=> {
          this._startingProcess = false;
          console.error( err );

          return err;
        }
      );
  }

  startAndMonitorProcess( processID? : string, opt? : any ) {
    return this.startProcess( processID )
      .then(
        ( rsp : any )=> {
          return this.monitorProcessStatus( rsp.id, opt );
        }
      )
      .then(
        ( rsp : any )=> {
          return this.updateTaskRunStatus();
        }
      )
      .then(
        ( rsp : any )=> {
          return this._restAPIService.instances.getInstance( this._processInstanceID )
        }
      )
      .then(
        ( rsp : any )=> {
          this._lastProcessInstanceFromBeginning = rsp;
          return rsp;
        }
      )
      .catch(
        ( err : any )=> {
          console.error( err );
          return err;
        }
      );
  }

  // monitor the status of a process till it's done or up to the max trials
  monitorProcessStatus(
    processInstanceID? : string,
    opt? : any
  ) : Promise<any> {
    processInstanceID = processInstanceID || this._processInstanceID;
    opt = _.assign(
      {}, {
        maxTrials : 20,
        queryInterval : 500 // ms // TODO change this small polling interval to slow down, this is for evaluating
      }, opt
    );

    this.clearTaskRunStatus();

    if ( processInstanceID ) {
      let trials = 0;
      let self = this;
      return new Promise(
        ( resolve, reject )=> {
          let processingStatus = { done : false };
          let done = ( timer : any, rsp : any ) => {
            processingStatus.done = true;
            clearInterval( timer );
            return resolve( rsp );
          };

          let timer = setInterval(
            () => {

              if ( trials > opt.maxTrials ) {
                clearInterval( timer );
                reject( `Reach maximum trial time: ${opt.maxTrials}` );
                return;
              }
              trials++;

              self._restAPIService.instances.getStatusByInstanceID( processInstanceID )
                .then(
                  ( rsp : any ) => {
                    ( // logging the response of each trial
                      function ( n : number ) {

                        switch ( rsp.status ) {
                          case '0':
                            console.log( `[PROC STATE][${n}] Process didn't start.` );
                            break;
                          case '100':
                            console.log( `[PROC STATE][${n}] Process is running...` );
                            self.updateTaskRunStatus(rsp.id, processingStatus);
                            break;
                          case '500':
                            console.log( `[PROC STATE][${n}] Process finished.` );
                            done( timer, rsp );
                            break;
                          case '600':
                            console.log( `[PROC STATE][${n}] Process has been cancelled.` );
                            done( timer, rsp );
                            break;
                          case '700':
                            console.log( `[PROC STATE][${n}] Process is failed.` );
                            done( timer, rsp );
                            break;
                          case null :
                            console.log( `[PROC STATE][${n}] Process is ~!@#$%^&*()_+.` );
                            done( timer, rsp );
                            break;
                        }

                        // TODO
                        console.log( rsp );

                      }( trials )
                    );
                  }
                );

            }, opt.queryInterval
          );
        }
      );

    } else {
      console.warn( 'No process instance has been logged.' );
      return Promise.reject( 'No process instance has been logged.' );
    }
  }

  clearTaskRunStatus() {
    _.forIn(
      this.tasks, ( task : any, taskID : string ) => {
        task.status = FLOGO_TASK_STATUS.DEFAULT;
      }
    );
  }

  updateTaskRunStatus( processInstanceID? : string, processingStatus? : {
    done: boolean
  } ) {
    processInstanceID = processInstanceID || this._processInstanceID;

    if ( processInstanceID ) {
      return this._restAPIService.instances.getStepsByInstanceID( processInstanceID )
        .then(
          ( rsp : any )=> {
            if ( _.has(processingStatus, 'done') && processingStatus.done) {
              // if using processingStatus and the processing status is done,
              // then skip the updating since the previous query may be out-of-date
              console.warn( 'Just logging to know if any query is discarded' );
              return rsp;
            } else {

              let steps = _.get( rsp, 'steps', [] );

              _.each(
                steps, ( step : any )=> {
                  // if the task is in steps array, it's run.
                  // need to convert the number task ID to base64 string
                  let task = this.tasks[flogoIDEncode(''+step.taskId)];

                  if ( task ) {
                    task.status = FLOGO_TASK_STATUS.DONE;
                  }
                }
              );

              // TODO logging
              // console.log( _.cloneDeep( this.tasks ) );

              // TODO
              //  how to verify if a task is running?
              //    should be the next task downstream the last running task
              //    but need to find the node of that task in the diagram

            }

            return rsp;
          }
        ).then(
          ( rsp : any )=> {

            this._postService.publish( FLOGO_DIAGRAM_PUB_EVENTS.render );

            return rsp;
          }
        );
    } else {
      console.warn( 'No process has been started.' );
      return Promise.reject( 'No process has been started.' );
    }

  }

  // TODO
  //  Remove this mock later
  mockGetSteps() {
    this._mockGettingStepsProcess = true;

    if ( this._processInstanceID ) {
      return this._restAPIService.instances.getStepsByInstanceID( this._processInstanceID )
        .then(
          ( rsp : any ) => {
            this._mockGettingStepsProcess = false;
            this._steps = rsp.steps;
            console.log( rsp );
            return rsp;
          }
        )
        .catch(
          ( err : any )=> {
            this._mockGettingStepsProcess = false;
            console.error( err );
          }
        );
    } else {
      console.warn( 'No process has been started.' );
    }
  }

  trackBySteps( idx : number, s : {id : string, [key : string] : string} ) {
    return s.id;
  }

  // TODO
  //  to do proper restart process, need to select proper snapshot, hence
  //  the current implementation is only for the last start-from-beginning snapshot, i.e.
  //  the using this._processInstanceID to restart
  restartProcessFrom( step : number, dataToRestart:string ) {

    if ( this._processInstanceID ) {
      this._restartingProcess = true;
      this._steps = null;

      this.clearTaskRunStatus();

      return this._restAPIService.flows.restartFrom(
        this._processInstanceID, JSON.parse( dataToRestart ), step
        )
        .then(
          ( rsp : any ) => {
            this._restartProcessInstanceID = rsp.id;
            this._restartingProcess = false;

            return rsp;
          }
        )
        .catch(
          ( err : any )=> {
            this._restartingProcess = false;
            console.error( err );

            return err;
          }
        );
    } else {
      console.warn( 'Should start from trigger for the first time.' );
      return Promise.reject( 'Should start from trigger for the first time.' );
    }
  }

  private _addTriggerFromDiagram( data : any, envelope : any ) {
    console.group( 'Add trigger message from diagram' );

    console.log( data );
    console.log( envelope );

    this._router.navigate( [ 'FlogoFlowsDetailTriggerAdd' ] )
      .then(
        () => {
          console.group( 'after navigation' );

          this._postService.publish(
            _.assign(
              {}, FLOGO_TRIGGERS_PUB_EVENTS.addTrigger, {
                data : data
              }
            )
          );

          console.groupEnd();
    });

    console.groupEnd( );
  }

  private _addTriggerFromTriggers( data: any, envelope: any) {
    console.group( 'Add trigger message from trigger' );

    console.log( data );
    console.log( envelope );

    this.tasks[ data.trigger.id ] = data.trigger;

    this._router.navigate( [ 'FlogoFlowsDetailDefault' ] )
      .then(
        ()=> {
          this._postService.publish(
            _.assign(
              {}, FLOGO_DIAGRAM_PUB_EVENTS.addTrigger, {
                data : {
                  node : data.node,
                  task : data.trigger
                },
                done : ( diagram : IFlogoFlowDiagram ) => {
                  _.assign( this.diagram, diagram );
                  this._updateFlow( this._flow );
                  this._isDiagramEdited = true;
                }
              }
            )
          );
        }
      );

    console.groupEnd( );

  }

  private _addTaskFromDiagram( data: any, envelope: any ) {
    console.group( 'Add task message from diagram' );

    console.log( data );
    console.log( envelope );

    this._router.navigate( [ 'FlogoFlowsDetailTaskAdd' ] )
      .then(
        () => {
          console.group( 'after navigation' );

          this._postService.publish(
            _.assign(
              {}, FLOGO_ADD_TASKS_PUB_EVENTS.addTask, {
                data : data
              }
            )
          );

          console.groupEnd();
        });

    console.groupEnd( );
  }

  private _addTaskFromTasks( data: any, envelope: any) {
    console.group( 'Add task message from task' );

    console.log( data );
    console.log( envelope );

    let taskName = this.uniqueTaskName(data.task.name);

    // generate task id when adding the task
    let task = _.assign({}, data.task, { id : flogoGenTaskID(), name: taskName });

    this.tasks[ task.id ] = task;

    this._router.navigate( [ 'FlogoFlowsDetailDefault' ] )
      .then(
        ()=> {
          this._postService.publish(
            _.assign(
              {}, FLOGO_DIAGRAM_PUB_EVENTS.addTask, {
                data : {
                  node : data.node,
                  task : task
                },
                done : ( diagram : IFlogoFlowDiagram ) => {
                  _.assign( this.diagram, diagram );
                  this._updateFlow( this._flow );
                  this._isDiagramEdited = true;
                }
              }
            )
          );
        }
      );

    console.groupEnd( );

  }


  private _selectTriggerFromDiagram( data: any, envelope: any ) {
    console.group( 'Select trigger message from diagram' );

    console.log( data );
    console.log( envelope );


    this._router.navigate(
      [
        'FlogoFlowsDetailTaskDetail',
        { id : data.node.taskID }
      ]
      )
      .then(
        () => {
          console.group( 'after navigation' );

          // Refresh task detail
          var currentStep = this._getCurrentState(data.node.taskID);
          var currentTask = _.assign({}, _.cloneDeep( this.tasks[ data.node.taskID ] ) );
          var context     = this._getCurrentContext(data.node.taskID);

          this._postService.publish(
            _.assign(
              {}, FLOGO_SELECT_TASKS_PUB_EVENTS.selectTask, {
                data : _.assign( {}, data,
                  { task : currentTask } ,
                  { step: currentStep },
                  { context: context}
                ),
                done: () => {
                  // select task done
                  //  only need this publish if the trigger has been changed
                  this._postService.publish(
                    _.assign(
                      {}, FLOGO_DIAGRAM_PUB_EVENTS.selectTrigger, {
                        data : {
                          node : data.node,
                          task : this.tasks[ data.node.taskID ]
                        },
                        done : ( diagram : IFlogoFlowDiagram ) => {
                          _.assign( this.diagram, diagram );
                          this._updateFlow( this._flow );
                        }
                      }
                    )
                  );

                }
              }
            )
          );

        }
      );


    console.groupEnd( );
  }

  private _getCurrentContext(taskId:any) {
    var isTrigger = this.tasks[taskId].type === FLOGO_TASK_TYPE.TASK_ROOT;
    var isBranch = this.tasks[taskId].type  === FLOGO_TASK_TYPE.TASK_BRANCH;
    var isTask = this.tasks[taskId].type  === FLOGO_TASK_TYPE.TASK;

    return {
            isTrigger: isTrigger,
            isBranch: isBranch,
            isTask: isTask,
            hasProcess: !!this._currentProcessID,
            isDiagramEdited: this._isDiagramEdited
    };
  }


  private _selectTaskFromDiagram( data: any, envelope: any ) {
    console.group( 'Select task message from diagram' );
    console.log( data );
    console.log( envelope );

    this._router.navigate(
      [
        'FlogoFlowsDetailTaskDetail',
        { id : data.node.taskID }
      ]
      )
      .then(
        () => {
          console.group( 'after navigation' );

          // Refresh task detail
          var currentStep = this._getCurrentState(data.node.taskID);
          var currentTask = _.assign({}, _.cloneDeep( this.tasks[ data.node.taskID ] ) );
          var context     = this._getCurrentContext(data.node.taskID);

          this._postService.publish(
            _.assign(
              {}, FLOGO_SELECT_TASKS_PUB_EVENTS.selectTask, {
                data : _.assign( {},
                                data,
                                { task : currentTask } ,
                                { step: currentStep },
                                { context: context }
                ),

                done: () => {
                  // select task done
                  this._postService.publish(
                    _.assign(
                      {}, FLOGO_DIAGRAM_PUB_EVENTS.selectTask, {
                        data : {
                          node : data.node,
                          task : this.tasks[ data.node.taskID ]
                        },
                        done : ( diagram : IFlogoFlowDiagram ) => {
                          _.assign( this.diagram, diagram );
                          this._updateFlow( this._flow );
                        }
                      }
                    )
                  );

                }
              }
            )
          );

        }
      );

    console.groupEnd( );
  }

  private _selectTaskFromTasks( data: any, envelope: any) {
    console.group( 'Select task message from task' );

    console.log( data );
    console.log( envelope );

    this.tasks[ data.task.id ] = data.task;

    this._router.navigate( [ 'FlogoFlowsDetailDefault' ] )
      .then(
        ()=> {
          this._postService.publish(
            _.assign(
              {}, FLOGO_DIAGRAM_PUB_EVENTS.selectTask, {
                data : {
                  node : data.node,
                  task : data.task
                },
                done : ( diagram : IFlogoFlowDiagram ) => {
                  _.assign( this.diagram, diagram );
                  this._updateFlow( this._flow );
                }
              }
            )
          );
        }
      );

    console.groupEnd( );

  }

  // TODO
  //  get step index logic should be based on the selected snapshot,
  //  hence need to be refined in the future
  //
  // based on the task id, look in the task list to get the number of the step
  //  TODO check if there is another way of get the step number
  private _getStepNumberFromTask(taskId:string) {
    let index = 0;
    let tasks = this.tasks || [];

    for(let task in tasks) {
      if(task == taskId) {
        return index +1;
      }
      ++index;
    }

    return 0;
  }

  // TODO
  //  get step index logic should be based on the selected snapshot,
  //  hence need to be refined in the future
  private _getStepNumberFromSteps(taskId:string) {
    var stepNumber:number = 0;
    // firstly try to get steps from the last process instance running from the beginning,
    // otherwise use some defauts
    let steps = _.get(this._lastProcessInstanceFromBeginning, 'steps', this._steps || []);
    taskId = flogoIDDecode( taskId ); // decode the taskId

    steps.forEach((step:any, index:number) => {
      if(step.taskId == taskId) {
        stepNumber = index + 1;
      }
    });

    return stepNumber;
  }

  private _getCurrentState(taskID:string) {
    var result:any;
    var steps = this._steps || [];

    steps.forEach((current) => {

      let id = taskID;
      try { // try to decode the base64 encoded taskId to number
        id = flogoIDDecode( id );
      } catch ( e ) {
        console.warn( e );
      }

      if(id == current.taskId) {
        result = current;
      }

    });

    return result;
  }



  private _runFromThisTile(data:any, envelope:any) {
    console.group('Run from this tile');

    if ( this.tasks[ data.taskId ].type === FLOGO_TASK_TYPE.TASK_ROOT ) {
      this._runFromTrigger();
    } else if ( this._processInstanceID ) {
      // run from other than the trigger (root task);

      let step = this._getStepNumberFromSteps( data.taskId );

      if ( step ) {
        this.restartProcessFrom( step, JSON.stringify( data.inputs ) )
          .then(
            ( rsp : any )=> {
              return this.monitorProcessStatus( rsp.id );
            }
          )
          .then(
            ( rsp : any )=> {
              return this.updateTaskRunStatus( rsp.id );
            }
          )
          .then(
            ( rsp : any )=> {

              this._steps = _.get( rsp, 'steps', [] );

              var currentStep = this._getCurrentState(data.taskId);
              var currentTask = _.assign({}, _.cloneDeep( this.tasks[ data.taskId ] ) );
              var context     = this._getCurrentContext(data.taskId);

              this._postService.publish(
                _.assign(
                  {}, FLOGO_SELECT_TASKS_PUB_EVENTS.selectTask, {
                    data: _.assign({},
                      data,
                      {task: currentTask},
                      {step: currentStep},
                      {context: context}
                    )
                  }
                ));

            }
          )
          .then(
            ()=> {

              if ( _.isFunction( envelope.done ) ) {
                envelope.done();
              }

            }
          )
          .catch(
            ( err : any )=> {
              console.error( err );

              return err;
            }
          );
      } else {
        // TODO
        console.warn( 'Cannot find proper step to restart from, skipping...' );
      }
    } else {
      // TODO
      //  handling the case that trying to start from the middle of a path without run from the trigger for the first time.
      let task = this.tasks[ data.taskId ];
      console.error( `Cannot start from task ${task.name} (${task.id})` );
    }

    console.groupEnd();

  }

  private _selectTransformFromDiagram(data:any, envelope:any) {
    let selectedNode = data.node;
    let previousNodes = this.findPathToNode(this.diagram.root.is, selectedNode.id);
    previousNodes.pop(); // ignore last item as it is the very same selected node
    let previousTiles = this.mapNodesToTiles(previousNodes);

    let selectedTaskId = selectedNode.taskID;

    this._postService.publish(
      _.assign(
        {}, FLOGO_TRANSFORM_PUB_EVENTS.selectActivity, {
          data: {
            previousTiles,
            tile: _.cloneDeep( this.tasks[selectedTaskId] )
          }
        }
      ));

  }

  private _saveTransformFromTransform(data:any, envelope:any){
    // data.tile.taskId
    // data.inputMappings

    let tile = this.tasks[data.tile.id];
    tile.inputMappings = _.cloneDeep(data.inputMappings);

    this._updateFlow( this._flow ).then(() => {
      this._postService.publish( FLOGO_DIAGRAM_PUB_EVENTS.render );
    });

  }

  private _deleteTransformFromTransform(data:any, envelope:any){
    // data.tile.taskId
    let tile = this.tasks[data.tile.id];
    delete tile.inputMappings;

    this._updateFlow( this._flow ).then(() => {
      this._postService.publish( FLOGO_DIAGRAM_PUB_EVENTS.render );
    });

  }

  private _deleteTaskFromDiagram( data : any, envelope : any ) {
    console.group( 'Delete task message from diagram' );

    console.log(data);

    let task = this.tasks[ _.get( data, 'node.taskID', '' ) ];
    let node = this.diagram.nodes[ _.get( data, 'node.id', '' ) ];

    // TODO
    //  refine confirmation
    //  delete trigger isn't hanlded
    if ( node.type !== FLOGO_FLOW_DIAGRAM_NODE_TYPE.NODE_ROOT && task && confirm( `Are you sure to delete task` ) ) {

      this._postService.publish(
        _.assign(
          {}, FLOGO_DIAGRAM_PUB_EVENTS.deleteTask, {
            data : {
              node : data.node
            },
            done : ( diagram : IFlogoFlowDiagram ) => {
              // TODO
              //  NOTE that once delete branch, not only single task is removed.
              delete this.tasks[ _.get( data, 'node.taskID', '' ) ];
              _.assign( this.diagram, diagram );
              this._updateFlow( this._flow );
              this._isDiagramEdited = true;
            }
          }
        )
      );
    }

    console.groupEnd();
  }

  private _addBranchFromDiagram( data : any, envelope : any ) {
    console.group( 'Add branch message from diagram' );

    console.log( data );

    // TODO
    //  remove this mock later
    //    here just creating a branch node with new branch info

    let branchInfo = {
      id : flogoGenTaskID(),
      type : FLOGO_TASK_TYPE.TASK_BRANCH,
      condition : ''
    };

    this.tasks[ branchInfo.id ] = branchInfo;

    this._postService.publish( _.assign( {}, FLOGO_DIAGRAM_PUB_EVENTS.addBranch, {
      data : {
        node : data.node,
        task : branchInfo
      },
      done : ( diagram : IFlogoFlowDiagram ) => {
        _.assign( this.diagram, diagram );
        this._updateFlow( this._flow );
      }
    } ) );

    console.groupEnd();
  }

  private _selectBranchFromDiagram( data : any, envelope : any ) {
    console.group( 'Select branch message from diagram' );

    console.log( data );

    // TODO
    //  reference to _selectTaskFromDiagram
    //  may need to route to some other URL?
    var currentStep = this._getCurrentState(data.node.taskID);
    var currentTask = _.assign({}, _.cloneDeep( this.tasks[ data.node.taskID ] ) );
    var context     = this._getCurrentContext(data.node.taskID);


    this._postService.publish(
      _.assign(
        {}, FLOGO_SELECT_TASKS_PUB_EVENTS.selectTask, {
          data : _.assign( {},
            data,
            { task : currentTask } ,
            { step: currentStep },
            { context: context }
          ),

          done: () => {
            // select task done
            this._postService.publish(
              _.assign(
                {}, FLOGO_DIAGRAM_PUB_EVENTS.selectTask, {
                  data : {
                    node : data.node,
                    task : this.tasks[ data.node.taskID ]
                  },
                  done : ( diagram : IFlogoFlowDiagram ) => {
                    _.assign( this.diagram, diagram );
                    this._updateFlow( this._flow );
                  }
                }
              )
            );

          }
        }
      )
    );

    console.groupEnd();
  }

  private uniqueTaskName(taskName:string) {
    // TODO for performance pre-normalize and store task names?
    let newNormalizedName = normalizeTaskName(taskName);

    let greatestIndex = _.reduce(this.tasks, (greatest:number, task:any) => {
      let currentNormalized = normalizeTaskName(task.name);
      let repeatIndex = 0;
      if (newNormalizedName == currentNormalized) {
        repeatIndex = 1;
      } else {
        let match = /^(.*)\-([0-9]+)$/.exec(currentNormalized); // some-name-{{integer}}
        if (match && match[1] == newNormalizedName) {
          repeatIndex = _.toInteger(match[2]);
        }
      }

      return repeatIndex > greatest ? repeatIndex : greatest;

    }, 0);

    return greatestIndex > 0 ? `${taskName} (${greatestIndex + 1})` : taskName;
  }

  /**
   * Finds a path from starting node to target node
   * Assumes we have a tree structure, meaning we have no cycles
   * @param {string} startNodeId
   * @param {string} targetNodeId
   * @returns string[] list of node ids
     */
  private findPathToNode(startNodeId:any, targetNodeId:any) {
    let nodes = this.diagram.nodes; // should be parameter?
    let queue = [[startNodeId]];

    while (queue.length > 0) {
      let path = queue.shift();
      let nodeId = path[path.length - 1];

      if (nodeId == targetNodeId) {
        return path;
      }

      let children = nodes[nodeId].children;
      if (children) {
        let paths = children.map(child => path.concat(child));
        queue = queue.concat(paths);
      }

    }

    return [];
  }

  private mapNodesToTiles(nodeIds:any[]) {
    return nodeIds
      .map(nodeId => {
        let node = this.diagram.nodes[nodeId];
        if (node.type == FLOGO_FLOW_DIAGRAM_NODE_TYPE.NODE) {
          return this.tasks[node.taskID];
        } else {
          return null;
        }
      })
      .filter(task => !!task);
  }


}
