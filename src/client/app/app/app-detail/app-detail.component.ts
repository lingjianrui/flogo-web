import * as _ from 'lodash';

import { Component, Input, Output, SimpleChanges, OnChanges, OnInit, ViewChild, EventEmitter } from '@angular/core';
import { TranslateService } from 'ng2-translate/ng2-translate';
import { IFlogoApplicationModel, IFlogoApplicationFlowModel, Trigger } from '../../core/application.model';
import {
  AppDetailService, ApplicationDetail, ApplicationDetailState, FlowGroup, App, TriggerGroup
} from '../../home/services/apps.service';
import { FlogoFlowsAddComponent } from '../../flogo.flows.add/components/add.component';
import { FlogoExportFlowsComponent } from './export-flows/export-flows.component';
import { SanitizeService } from '../../core/services/sanitize.service';
import { diffDates, notification } from '../../shared/utils';
import { FlogoModal } from '../../core/services/modal.service';
import { FLOGO_PROFILE_TYPE } from '../../core/constants';
import { FlogoProfileService } from '../../core/services/profile.service';

const MAX_SECONDS_TO_ASK_APP_NAME = 5;

@Component({
  selector: 'flogo-apps-details-application',
  templateUrl: 'app-detail.component.html',
  styleUrls: ['app-detail.component.less']
})
export class FlogoApplicationDetailComponent implements OnChanges, OnInit {
  @ViewChild(FlogoFlowsAddComponent) addFlow: FlogoFlowsAddComponent;
  @ViewChild('exportFlowModal') exportFlow: FlogoExportFlowsComponent;
  @Input() appDetail: ApplicationDetail;

  @Output() flowSelected: EventEmitter<IFlogoApplicationFlowModel> = new EventEmitter<IFlogoApplicationFlowModel>();
  @Output() flowAdded: EventEmitter<IFlogoApplicationFlowModel> = new EventEmitter<IFlogoApplicationFlowModel>();
  @Output() flowDeleted: EventEmitter<IFlogoApplicationModel> = new EventEmitter<IFlogoApplicationModel>();
  @Output() onDeletedApp: EventEmitter<IFlogoApplicationModel> = new EventEmitter<IFlogoApplicationModel>();

  application: App;
  state: ApplicationDetailState;

  isNameInEditMode: boolean;
  autofocusName = true;
  editableName: string;

  isDescriptionInEditMode: boolean;
  editableDescription: string;

  flowGroups: Array<FlowGroup> = [];
  triggerGroups: Array<TriggerGroup> = [];
  flows: Array<IFlogoApplicationFlowModel> = [];
  isFlowsViewActive: boolean;
  selectedViewTranslateKey: string;

  isNewApp = false;

  isBuildBoxShown = false;
  isExportBoxShown = false;
  downloadLink: string;

  profileType: FLOGO_PROFILE_TYPE;
  PROFILE_TYPES: typeof FLOGO_PROFILE_TYPE = FLOGO_PROFILE_TYPE;

  constructor(public translate: TranslateService,
              private appDetailService: AppDetailService,
              public flogoModal: FlogoModal,
              public profileSerivce: FlogoProfileService,
              private sanitizer: SanitizeService) {
  }

  ngOnInit() {
    this.isDescriptionInEditMode = false;
    this.isNameInEditMode = false;
    this.isFlowsViewActive = true;
    this.selectedViewTranslateKey = 'DETAILS-VIEW-MENU:FLOWS';
  }

  ngOnChanges(changes: SimpleChanges) {
    const change = changes['appDetail'];
    if (change.currentValue) {
      this.application = this.appDetail.app;
      this.state = this.appDetail.state;
      const flowGroups = this.application ? this.application.flowGroups : null;
      this.flowGroups = flowGroups ? [...this.application.flowGroups] : [];
      this.flowGroups = _.sortBy(this.flowGroups, g => g.trigger ? g.trigger.name.toLocaleLowerCase() : '');
      const triggerGroups = this.application ? this.application.triggerGroups : null;
      this.triggerGroups = triggerGroups ? [...this.application.triggerGroups] : [];
      this.triggerGroups = _.sortBy(this.triggerGroups, g => g.triggers ? g.flow.name.toLocaleLowerCase() : '');
      this.downloadLink = this.appDetailService.getDownloadLink(this.application.id);
      // this.flows = this.extractFlows();

      this.profileType = this.profileSerivce.getProfileType(this.application);

      const prevValue = change.previousValue;
      const isDifferentApp = !prevValue || !prevValue.app || prevValue.app.id !== this.application.id;
      if (isDifferentApp) {
        this.appUpdated();
      } else {
        this.appDetailChanged();
      }
    }
  }

  appExporter() {
    return () => this.appDetailService.toEngineSpec()
      .then(engineApp => {
        const appName = _.snakeCase(engineApp.name);
        return [{
          fileName: `${appName}.json`,
          data: engineApp
        }];
      });
  }

  openCreateFlow() {
    this.addFlow.open();
  }

  openCreateFlowFromTrigger(trigger: Trigger) {
    this.addFlow.open(trigger.id);
  }

  onClickAddDescription(event) {
    this.isDescriptionInEditMode = true;
  }
  openExportFlow() {
    this.exportFlow.openExport();
  }
  onNameSave() {
    let editableName = this.editableName || '';
    editableName = editableName.trim();
    if (!editableName) {
      return;
    }
    editableName = this.sanitizer.sanitizeHTMLInput(editableName);
    this.isNameInEditMode = false;
    this.appDetailService.update('name', editableName);
  }

  onNameCancel() {
    this.isNameInEditMode = false;
    this.appDetailService.cancelUpdate('name');
    this.editableName = this.application.name;
  }

  onDescriptionSave() {
    this.isDescriptionInEditMode = false;
    this.editableDescription = this.sanitizer.sanitizeHTMLInput(this.editableDescription);
    this.appDetailService.update('description', this.editableDescription);
  }

  onSaveDeviceSettings(settings: any[]) {
    if (!this.application.device) {
      this.application.device = {};
    }

    this.application.device.settings = settings;
    this.appDetailService.update('device', this.application.device);
  }

  onDescriptionCancel() {
    this.isDescriptionInEditMode = false;
    this.appDetailService.cancelUpdate('description');
    this.editableDescription = this.application.description;
  }

  onClickLabelDescription() {
    this.isDescriptionInEditMode = true;
  }

  onClickLabelName() {
    this.isNameInEditMode = true;
  }

  onChangedSearch(search) {
    const flows = this.application.flows || [];

    if (search && flows.length) {
      const filtered = flows.filter((flow: IFlogoApplicationFlowModel) => {
        return (flow.name || '').toLowerCase().includes(search.toLowerCase()) ||
          (flow.description || '').toLowerCase().includes(search.toLowerCase());
      });

      this.flows = filtered || [];

    } else {
      this.flows = this.extractFlows();
    }
  }

  onFlowSelected(flow) {
    this.flowSelected.emit(flow);
  }

  onFlowDelete(eventData) {
    this.flowDeleted.emit(eventData);
  }

  onFlowImportSuccess(result: any) {
    const message = this.translate.instant('FLOWS:SUCCESS-MESSAGE-IMPORT');
    notification(message, 'success', 3000);
    this.flowAdded.emit(result);
  }

  onFlowImportError(err: {
    status: string;
    statusText: string;
    response: any
  }) {
    // let message = this.translate.instant('FLOWS:ERROR-MESSAGE-IMPORT', {value: err.response});
    notification(err.response, 'error');
  }

  onDeleteApp(application) {
    const message = this.translate.instant('APP-DETAIL:CONFIRM_DELETE', { appName: application.name });
    this.flogoModal.confirmDelete(message).then((res) => {
      if (res) {
        this.appDetailService.deleteApp();
      }
    });
  }

  toggleBuildBox() {
    this.isBuildBoxShown = !this.isBuildBoxShown;
  }

  closeBuildBox() {
    this.isBuildBoxShown = false;
  }
  toggleExportBox() {
    this.isExportBoxShown = !this.isExportBoxShown;
  }

  closeExportBox() {
    this.isExportBoxShown = false;
  }

  showDetailsView(viewType: string) {
    this.isFlowsViewActive = viewType === 'flows';
    this.selectedViewTranslateKey = this.isFlowsViewActive ? 'DETAILS-VIEW-MENU:FLOWS' : 'DETAILS-VIEW-MENU:TRIGGERS';
  }

  private appUpdated() {
    this.isDescriptionInEditMode = false;

    this.editableName = this.application.name;
    this.editableDescription = this.application.description;

    this.isNameInEditMode = false;
    this.isNewApp = !this.application.updatedAt;
    if (this.isNewApp) {
      const secondsSinceCreation = diffDates(Date.now(), this.application.createdAt, 'seconds');
      this.isNewApp = secondsSinceCreation <= MAX_SECONDS_TO_ASK_APP_NAME;
      this.isNameInEditMode = this.isNewApp;
    }

  }

  private appDetailChanged() {
    if (this.state.name.hasErrors) {
      this.isNameInEditMode = true;
      this.autofocusName = false;
      setTimeout(() => this.autofocusName = true, 100);
    } else if (!this.state.name.pendingSave) {
      this.editableName = this.application.name;
    }
  }

  private extractFlows() {
    return _.clone(this.application.flows || []);
  }
}