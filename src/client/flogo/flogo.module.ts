import { APP_INITIALIZER, NgModule } from '@angular/core';
import { APP_BASE_HREF } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';

import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { BsModalModule } from 'ng2-bs3-modal';

import { CoreModule, LanguageService } from '@flogo/core';
import { createTranslateLoader } from '@flogo/core/language';
import { initializer } from '@flogo/core/initializer';
import { SharedModule as FlogoSharedModule } from '@flogo/shared';

import { LogsModule as FlogoLogsModule } from '@flogo/logs';

import { appRoutingProviders, routing } from './flogo.routing';
import { FlogoAppComponent } from './flogo.component';
import { environment } from '../environments/environment';

@NgModule({
  imports: [
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: (createTranslateLoader),
        deps: [HttpClient],
      }
    }),
    StoreModule.forRoot({}),
    !environment.production ? StoreDevtoolsModule.instrument({
      maxAge: 25, // Retains last 25 states
      logOnly: environment.production // Restrict extension to log-only mode
    }) : [],
    BrowserModule,
    BrowserAnimationsModule,
    CoreModule,
    // todo: should be in common?
    BsModalModule,

    FlogoSharedModule,
    FlogoLogsModule,
    routing,
  ],
  declarations: [
    FlogoAppComponent
  ],
  bootstrap: [FlogoAppComponent],
  providers: [
    { provide: LanguageService, useExisting: TranslateService },
    { provide: APP_INITIALIZER, useFactory: initializer, deps: [TranslateService], multi: true },
    { provide: APP_BASE_HREF, useValue: '/' },
    appRoutingProviders
  ]
})
export class FlogoModule {
}
