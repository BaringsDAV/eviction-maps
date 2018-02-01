import {
  Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges, ChangeDetectorRef
} from '@angular/core';
import { environment } from '../../../environments/environment';
import { DownloadFormComponent } from './download-form/download-form.component';
import { UiDialogService } from '../../ui/ui-dialog/ui-dialog.service';
import { MapFeature } from '../map/map-feature';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { PlatformService } from '../../platform.service';
import { PlatformLocation } from '@angular/common';
import { DataService } from '../../data/data.service';
import { MapDataAttribute } from '../map/map-data-attribute';

@Component({
  selector: 'app-data-panel',
  templateUrl: './data-panel.component.html',
  styleUrls: ['./data-panel.component.scss'],
  providers: [ TranslatePipe ]
})
export class DataPanelComponent implements OnInit {

  /** Year input and output (allows double binding) */
  private _year: number;
  @Input() set year(newYear: number) {
    if (newYear !== this._year) {
      this.yearChange.emit(newYear);
    }
    this._year = newYear;
  }
  get year() { return this._year; }
  @Output() yearChange = new EventEmitter();

  /** Location Attributes */
  displayLocations: MapFeature[] = []; // Locations to use for location cards, download
  @Input() set locations(locations: MapFeature[]) {
    this.displayLocations = locations;
    this.updateTwitterText();
  }
  get locations() { return this.displayLocations; }
  @Output() locationRemoved = new EventEmitter();
  @Output() locationAdded = new EventEmitter();

  /** Data attributes for location cards and graph */
  private _dataAttributes = [];
  @Input() set dataAttributes(attr: MapDataAttribute[]) {
    this._dataAttributes = attr;
    this.updateCardAttributes();
    this.updateGraphAttributes();
  }
  get dataAttributes() { return this._dataAttributes; }
  graphAttributes: MapDataAttribute[] = [];
  cardAttributes: MapDataAttribute[] = [];

  // Used to inform map tool when graph type changes
  @Output() graphTypeChange = new EventEmitter();


  tweetTranslation = 'DATA.TWEET_ONE_FEATURE';
  tweetParams = {};

  constructor(
    public dialogService: UiDialogService,
    public dataService: DataService,
    private translatePipe: TranslatePipe,
    private translate: TranslateService,
    private platform: PlatformService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.translate.onLangChange.subscribe(() => {
      this.updateTwitterText();
    });
    // Needed to prevent ExpressionChangedAfterItHasBeenCheckedError
    this.cd.detectChanges();
  }

  /** Builds the array of card attributes from the array of data attributes */
  updateCardAttributes() {
    const dividerIndex = 11; // index where the divider is inserted
    const divider = { id: 'divider', langKey: 'STATS.DEMOGRAPHICS' };
    // put the props in the correct order
    const cardProps = this._dataAttributes
      .filter(d => typeof d.order === 'number')
      .sort((a, b) => a.order > b.order ? 1 : -1);
    // add the divider
    this.cardAttributes = [
      ...cardProps.slice(0, dividerIndex), divider, ...cardProps.slice(dividerIndex)
    ];
  }

  /** Builds the array of attributes available for the graph */
  updateGraphAttributes() {
    // only graphing the bubble attributes
    this.graphAttributes = this.dataAttributes
      .filter(d => d.type === 'bubble' && d.id !== 'none');
  }

  showDownloadDialog(e) {
    const config = {
      lang: this.translate.currentLang,
      year: this.year,
      startYear: this.dataService.activeLineYearStart,
      endYear: this.dataService.activeLineYearEnd,
      features: this.displayLocations,
      dataProp: this.dataService.activeDataHighlight.id,
      bubbleProp: this.dataService.activeBubbleHighlight.id,
      showUsAverage: this.dataService.activeShowGraphAvg,
      usAverage: this.dataService.usAverage
    };
    this.dialogService.showDownloadDialog(DownloadFormComponent, config);
  }

  showFileDialog(e) {
    this.dialogService.showDialog({
      title: 'Select a file type',
      content: [
        { type: 'text', data: 'Check one or more of the file types:' },
        { type: 'checkbox', data: { value: false, label: 'PDF' } },
        { type: 'checkbox', data: { value: false, label: 'Excel' } }
      ]
    }).subscribe((response) => {
      console.log(response);
    });
  }

  /**
   * Update Twitter share text
   */
  updateTwitterText() {
    const features = this.locations;
    const featLength = this.locations.length;
    this.tweetParams = { year: this.year, link: this.getCurrentUrl() };

    if (featLength === 1) {
      this.tweetTranslation = 'DATA.TWEET_ONE_FEATURE';
      this.tweetParams = { ...this.tweetParams, place1: features[0].properties.n };
    } else if (featLength === 2) {
      this.tweetTranslation = 'DATA.TWEET_TWO_FEATURES';
      this.tweetParams = {
        ...this.tweetParams, place1: features[0].properties.n, place2: features[1].properties.n
      };
    } else if (featLength === 3) {
      this.tweetTranslation = 'DATA.TWEET_THREE_FEATURES';
      this.tweetParams = {
        ...this.tweetParams,
        place1: features[0].properties.n,
        place2: features[1].properties.n,
        place3: features[2].properties.n
      };
    }
  }

  /**
   * Adding method because calling window directly in the template doesn't work
   */
  getCurrentUrl() {
    return window.location.href;
  }

  /**
   * Display dialog with error message if mailto link doesn't open after 1 second
   * @param e
   */
  checkMailto(e) {
    // Cancel if on mobile, since behavior isn't the same
    if (this.platform.isMobile) {
      return;
    }
    // https://www.uncinc.nl/articles/dealing-with-mailto-links-if-no-mail-client-is-available
    let timeout;

    window.addEventListener('blur', () => clearTimeout(timeout));
    timeout = setTimeout(() => {
      this.dialogService.showDialog({
        title: 'Email Link Error',
        content: [
          {
            type: 'text',
            data: 'Please set a default mail client in your browser to use the email link.'
          }
        ]
      });
    }, 1000);
  }
}
