import { Injectable, EventEmitter, Component } from '@angular/core';
import { BsModalService, ModalOptions } from 'ngx-bootstrap/modal';
import { BsModalRef } from 'ngx-bootstrap/modal/bs-modal-ref.service';
import { UiDialogComponent } from './ui-dialog.component';
import { DialogResponse, AppDialog } from './ui-dialog.types';
import { PlatformService } from '../../services/platform.service';


@Injectable()
export class UiDialogService {

  private currentDialogRef: BsModalRef;

  constructor(
    private modalService: BsModalService,
    private platform: PlatformService
  ) {}

  /**
   * Gets the current dialog reference, if any.
   */
  getCurrentDialog(): BsModalRef { return this.currentDialogRef; }

  /**
   * Shows a dialog component and returns an observable that fires when the
   * modal is closed.
   * @param config title, content, button configuration for dialog
   */
  showDialog(config, component: any = UiDialogComponent): EventEmitter<DialogResponse> {
    this.platform.saveActiveElement();
    const dialogConfig = this.processConfig(config);
    this.currentDialogRef =
      this.modalService.show(component, (config.options ? config.options : null));
    this.currentDialogRef.content.setDialogConfig(dialogConfig);
    this.currentDialogRef.content.buttonClicked.take(1).subscribe(() => {
      this.platform.restoreActiveElement();
    });
    return this.currentDialogRef.content.buttonClicked;
  }

  /**
   * Helper function for showing error dialogs.
   * @param message error message
   */
  showErrorDialog(message: string): EventEmitter<DialogResponse> {
    const dialog = {
      title: 'Error',
      content: [ { type: 'text', data: message } ],
      buttons: { ok: true, cancel: false }
    };
    return this.showDialog(dialog);
  }

  /**
   * Helper function for showing confirmation dialogs.
   * @param title title for the confirmation
   * @param message confirmation message
   */
  showConfirmDialog(title: string, message: string): EventEmitter<DialogResponse> {
    const dialog = {
      title: title,
      content: [ { type: 'text', data: message } ],
      buttons: { ok: true, cancel: true }
    };
    return this.showDialog(dialog);
  }

  /**
   * Helper function for showing form dialogs.
   * @param title title for the form dialog
   * @param inputs an array of objects representing inputs
   */
  showFormDialog(title, inputs): EventEmitter<DialogResponse> {
    // TODO
    const dialog = {
      title: title,
      content: inputs,
      buttons: { ok: true, cancel: true }
    };
    return this.showDialog(dialog);
  }

  /**
   * Format the config object to match what the component is expecting
   */
  private processConfig(config: any = {}) {
    if (typeof config === 'string') {
      const tmpString = config;
      config = { content: [ { type: 'text', data: tmpString } ] };
    } else if (typeof config.content === 'string') {
      config.content = [ { type: 'text', data: config.content } ];
    } else if (config.content && this.isContentObject(config.content)) {
      // if single content object provided as content
      config.content = [ config.content ];
    }
    // set default buttons if none provided
    if (!config.buttons) {
      config.buttons = { ok: true, cancel: false };
    }
    return config;
  }

  /**
   * Checks if the passed object is a DialogContentItem
   * @param obj
   */
  private isContentObject(obj) {
    return (obj.type && obj.data);
  }

}
