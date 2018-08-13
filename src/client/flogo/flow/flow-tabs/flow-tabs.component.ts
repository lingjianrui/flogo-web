import {Component} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {FlowActions, FlowSelectors, FlowState} from '@flogo/flow/core/state';
import {takeUntil} from 'rxjs/operators';
import {SingleEmissionSubject} from '@flogo/core/models';

@Component({
  selector: 'flogo-flow-tabs',
  templateUrl: './flow-tabs.component.html',
  styleUrls: ['./flow-tabs.component.less']
})

export class FlowTabsComponent {
  isErrorHandlerShown = false;
  private ngOnDestroy$ = SingleEmissionSubject.create();

  constructor(private store: Store<FlowState>) {
    this.store.pipe(select(FlowSelectors.selectErrorPanelStatus),
      takeUntil(this.ngOnDestroy$)).subscribe(isErrorPanelOpen => {
      if (isErrorPanelOpen) {
        this.isErrorHandlerShown = true;
      } else {
        this.isErrorHandlerShown = false;
      }
    });

  }

  selectPrimaryFlow() {
    this.store.dispatch(new FlowActions.ErrorPanelStatusChange({isOpen: false}));
  }

  selectErrorHandler() {
    this.store.dispatch(new FlowActions.ErrorPanelStatusChange({isOpen: true}));
  }

}