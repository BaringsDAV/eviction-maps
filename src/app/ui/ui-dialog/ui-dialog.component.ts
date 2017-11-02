import { Component, EventEmitter } from '@angular/core';
import { BsModalService } from 'ngx-bootstrap/modal';
import { BsModalRef } from 'ngx-bootstrap/modal/modal-options.class';

import { DialogConfig, DialogContentItem, DialogResponse } from './ui-dialog.types';

@Component({
  selector: 'app-ui-dialog',
  templateUrl: './ui-dialog.component.html',
  styleUrls: [ './ui-dialog.component.scss' ]
})
export class UiDialogComponent {

  title: string;
  content: Array<DialogContentItem> = [
    { type: 'text', data: 'some message'}
  ];
  buttons = {
    ok: true,
    cancel: false
  };
  buttonClicked = new EventEmitter<DialogResponse>();

  constructor(public bsModalRef: BsModalRef) {}

  setDialogConfig(dialogConfig: DialogConfig) {
    this.title = dialogConfig.title;
    this.content = dialogConfig.content;
    this.buttons = dialogConfig.buttons;
  }

  onOkayClick (e) {
    this.dismiss({ accepted: true, content: this.content });
  }

  onCancelClick(e) {
    this.dismiss({ accepted: false });
  }

  private dismiss(data) {
    this.buttonClicked.emit(data);
    this.bsModalRef.hide();
  }

}
