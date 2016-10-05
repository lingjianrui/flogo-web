import { Component, ElementRef, EventEmitter } from '@angular/core';
import { RESTAPIFlowsService } from '../../../common/services/restapi/flows-api.service';
import { notification } from '../../../common/utils';

@Component( {
  selector : 'flogo-flows-import',
  moduleId : module.id,
  templateUrl : 'import-flow.tpl.html',
  styleUrls : [ 'import-flow.component.css' ],
  outputs : [ 'onError:importError', 'onSuccess:importSuccess' ]
} )
export class FlogoFlowsImport {
  private _elmRef : ElementRef;
  onError : EventEmitter<any>;
  onSuccess : EventEmitter<any>;

  constructor( elementRef : ElementRef, private _flowsAPIs : RESTAPIFlowsService ) {
    this._elmRef = elementRef;
    this.onError = new EventEmitter<any>();
    this.onSuccess = new EventEmitter<any>();
  }

  public selectFile( evt : any ) {
    let fileElm = jQuery( this._elmRef.nativeElement )
      .find( '.flogo-flows-import-input-file' );

    // clean the previous selected file
    try {
      fileElm.val( '' );
    } catch ( err ) {
      console.error( err );
    }

    // trigger the file input.
    // fileElm.click();
  }

  public onFileChange( evt : any ) {
    let importFile = <File> _.get( evt, 'target.files[0]' );

    if ( _.isUndefined( importFile ) ) {
      console.error( 'Invalid file to import' );
    } else {
      this._flowsAPIs.importFlow( importFile )
        .then( ( result : any )=> {
          this.onSuccess.emit( result );
        } )
        .catch( ( err : any )=> {
          console.error( err );
          this.onError.emit( err );
        } );
    }
  }
}
