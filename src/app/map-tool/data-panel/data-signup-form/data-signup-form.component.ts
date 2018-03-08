import { Component, EventEmitter, OnInit, ViewChild, ElementRef } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { BsModalService } from 'ngx-bootstrap/modal';
import { BsModalRef } from 'ngx-bootstrap/modal/bs-modal-ref.service';
import { DialogResponse } from '../../../ui/ui-dialog/ui-dialog.types';
import { AnalyticsService } from '../../../services/analytics.service';

@Component({
  selector: 'app-data-signup-form',
  templateUrl: './data-signup-form.component.html',
  styleUrls: ['./data-signup-form.component.scss'],
  providers: [ TranslatePipe ]
})
export class DataSignupFormComponent implements OnInit {

  @ViewChild('form') formEl: ElementRef;

  constructor(
    public bsModalRef: BsModalRef,
    private analytics: AnalyticsService
  ) {}

  ngOnInit() {
    this.analytics.trackEvent('dataSubscribe', { subscribed: false });
  }

  onCancelClick(e) { this.dismiss({ accepted: false }); }

  /**
   * Handler for form submission
   * NOTE: Form will not submit in dialog unless manually submitted with javascript
   */
  formSubmit() {
    this.analytics.trackEvent('dataSubscribe', { subscribed: true });
    this.formEl.nativeElement.submit();
  }

  private dismiss(data) { this.bsModalRef.hide(); }

}