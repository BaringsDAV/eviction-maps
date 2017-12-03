import { Component, EventEmitter, ElementRef, HostListener, HostBinding, ViewChild, Input, Output } from '@angular/core';

// TODO: add key bindings

@Component({
  selector: 'app-ui-slider',
  templateUrl: './ui-slider.component.html',
  styleUrls: ['./ui-slider.component.scss']
})
export class UiSliderComponent {
  position = 0;
  get percent() { return (this.position * 100) + '%'; }
  @Input() label;
  @Input() vertical = false;
  @Input() min = 0;
  @Input() max = 100;
  @Input() step = 1;
  @Output() change = new EventEmitter<number>();
  @ViewChild('scrubber') scrubber;
  @HostBinding('class.active') pressed = false;
  private elRect = null;
  private _currentValue = 0;

  /**
   * Using getter and setter on currentValue to handle
   * updates from external components
   */
  @Input() set currentValue(value) {
    this.setValue(value);
  }

  get currentValue() {
    return this._currentValue;
  }

  constructor(public el: ElementRef) { }

  /**
   * Update the slider dimensions when the window resizes
   * @param e window resize event
   */
  @HostListener('window:resize', ['$event']) onResize(e) {
    this.setSliderDimensions();
  }

  /**
   * Set the pressed status and scrubber position when element is pressed
   * @param e mousedown event
   */
  @HostListener('mousedown', ['$event']) onPress(e) {
    this.setSliderDimensions();
    this.setScrubberPosition(e);
    this.pressed = true;
  }

  /**
   * If the scrubber is currently pressed, update the position when the
   * mouse moves.
   * @param e mousemove event
   */
  @HostListener('document:mousemove', ['$event']) onMove(e) {
    if (this.pressed) {
      this.setScrubberPosition(e);
    }
  }

  /**
   * Remove the pressed status and update scrubber position when released
   * after dragging or clicking
   * @param e mousup event
   */
  @HostListener('document:mouseup', ['$event']) onRelease(e) {
    if (this.pressed) {
      this.setValue();
      this.pressed = false;
    }
  }

  @HostListener('touchstart', ['$event']) onTouchPress(e) {
    if (e.touches && e.touches.length === 1) {
      this.setSliderDimensions();
      this.setScrubberPosition(e.touches[0]);
      this.pressed = true;
    }
  }

  @HostListener('touchmove', ['$event']) onTouchMove(e) {
    if (this.pressed && e.touches && e.touches.length === 1) {
      this.setScrubberPosition(e.touches[0]);
    }
  }

  @HostListener('touchend', ['$event']) onTouchEnd(e) {
    if (this.pressed && e.touches && e.touches.length === 1) {
      this.setValue();
      this.pressed = false;
    }
  }

  // TODO: change so keydown only triggers on element focus
  @HostListener('keydown', ['$event']) onKeypress(e) {
    if (this.vertical && (e.keyCode === 38 || e.keyCode === 40)) {
      if (e.keyCode === 38) {
        // up
        this.setValue(this._currentValue + this.step);
      }
      if (e.keyCode === 40) {
        this.setValue(this._currentValue - this.step);
      }
      this.change.emit(this.getStepValue());
    } else if (!this.vertical && (e.keyCode === 37 || e.keyCode === 39)) {
      if (e.keyCode === 37) {
        // left
        this.setValue(this._currentValue - this.step);
      }
      if (e.keyCode === 39) {
        this.setValue(this._currentValue + this.step);
      }
      this.change.emit(this.getStepValue());
    }
  }

  // TODO: use this.step return values that fall within the step amount
  getStepValue(val?: number): number {
    const step = 1 / this.step;
    if (!val) { val = ((this.max - this.min) * this.position + this.min); }
    return (Math.round((val * step)) / step);
  }


  /**
   * Set the value and scrubber position
   * @param val the slider value
   */
  setValue(val: number = this._currentValue) {
    this._currentValue = this.getStepValue(Math.min(this.max, Math.max(this.min, val)));
    this.position = (this._currentValue - this.min) / (this.max - this.min);
  }

  /**
   * update the dimensions of the parent element
   */
  private setSliderDimensions() {
    this.elRect = this.el.nativeElement.getBoundingClientRect();
  }

  /**
   * Gets a value between 0 and 1 based on the element rectangle and screen offset
   * @param offset clientY (or pageY) position
   */
  private getVerticalValue(offset) {
      return Math.max(0,
        ((this.elRect.height - Math.abs(offset - this.elRect.top)) / this.elRect.height)
      );
  }

    /**
   * Gets a value between 0 and 1 based on the element rectangle and screen offset
   * @param offset clientX (or pageX) position
   */
  private getHorizontalValue(offset) {
    return Math.max(0, ((offset - this.elRect.left) / this.elRect.width));
  }

  /**
   * Set the scrubber position based on event values, but keep between 0 and 100
   * @param e the mouse event
   */
  private setScrubberPosition(e) {
    if (e.clientX && this.elRect) {
      const maxVal =
        this.vertical ? this.getVerticalValue(e.clientY) : this.getHorizontalValue(e.clientX);
      this.setValue(maxVal);
      this.position = Math.min(1, maxVal);
      const newValue = this.getStepValue();
      if (newValue !== this.currentValue) {
        this.currentValue = newValue;
        this.change.emit(newValue);
      }
    }
  }
}
