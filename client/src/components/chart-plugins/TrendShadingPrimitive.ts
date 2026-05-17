import {
  ISeriesPrimitive,
  ISeriesPrimitivePaneView,
  ISeriesPrimitivePaneRenderer,
  SeriesAttachedParameter,
  Time,
} from 'lightweight-charts';

export interface ShadingItem {
  startTime: number;
  endTime: number;
  color: string;
}

class TrendShadingRenderer implements ISeriesPrimitivePaneRenderer {
  private _data: ShadingItem[];
  private _series: any;
  private _chart: any;

  constructor(data: ShadingItem[], series: any, chart: any) {
    this._data = data;
    this._series = series;
    this._chart = chart;
  }

  draw(target: any) {
    if (!this._series || !this._chart || this._data.length === 0) return;

    const timeScale = this._chart.timeScale();

    target.useMediaCoordinateSpace((scope: any) => {
      const ctx = scope.context;
      const height = scope.mediaSize.height;
      const canvasWidth = scope.mediaSize.width;

      ctx.save();

      for (const item of this._data) {
        const startX = timeScale.timeToCoordinate(item.startTime as Time);
        const endX = timeScale.timeToCoordinate(item.endTime as Time);

        if (startX === null && endX === null) continue;

        const x1 = startX !== null ? startX : 0;
        const x2 = endX !== null ? endX : canvasWidth;

        const left = Math.min(x1, x2) - 6;
        const right = Math.max(x1, x2) + 6;
        const width = Math.max(1, right - left);

        ctx.fillStyle = item.color;
        ctx.fillRect(left, 0, width, height);
      }

      ctx.restore();
    });
  }
}

class TrendShadingPaneView implements ISeriesPrimitivePaneView {
  private _renderer: TrendShadingRenderer;

  constructor(data: ShadingItem[], series: any, chart: any) {
    this._renderer = new TrendShadingRenderer(data, series, chart);
  }

  renderer() {
    return this._renderer;
  }

  zOrder(): 'bottom' {
    return 'bottom';
  }
}

export class TrendShadingPrimitive implements ISeriesPrimitive {
  private _data: ShadingItem[] = [];
  private _paneViews: TrendShadingPaneView[] = [];
  private _series: any = null;
  private _chart: any = null;
  private _requestUpdate: (() => void) | null = null;

  attached(param: SeriesAttachedParameter<Time>) {
    this._series = param.series;
    this._chart = param.chart;
    this._requestUpdate = param.requestUpdate;
    this._paneViews = [new TrendShadingPaneView(this._data, this._series, this._chart)];
  }

  detached() {
    this._series = null;
    this._chart = null;
    this._requestUpdate = null;
    this._paneViews = [];
  }

  paneViews() {
    return this._paneViews;
  }

  setData(data: ShadingItem[]) {
    this._data = data;
    if (this._series && this._chart) {
      this._paneViews = [new TrendShadingPaneView(this._data, this._series, this._chart)];
      if (this._requestUpdate) {
        this._requestUpdate();
      }
    }
  }
}
