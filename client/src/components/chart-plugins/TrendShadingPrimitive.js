class TrendShadingRenderer {
    _data;
    _series;
    _chart;
    constructor(data, series, chart) {
        this._data = data;
        this._series = series;
        this._chart = chart;
    }
    draw(target) {
        if (!this._series || !this._chart || this._data.length === 0)
            return;
        const timeScale = this._chart.timeScale();
        target.useMediaCoordinateSpace((scope) => {
            const ctx = scope.context;
            const height = scope.mediaSize.height;
            const canvasWidth = scope.mediaSize.width;
            ctx.save();
            for (const item of this._data) {
                const startX = timeScale.timeToCoordinate(item.startTime);
                const endX = timeScale.timeToCoordinate(item.endTime);
                if (startX === null && endX === null)
                    continue;
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
class TrendShadingPaneView {
    _renderer;
    constructor(data, series, chart) {
        this._renderer = new TrendShadingRenderer(data, series, chart);
    }
    renderer() {
        return this._renderer;
    }
    zOrder() {
        return 'bottom';
    }
}
export class TrendShadingPrimitive {
    _data = [];
    _paneViews = [];
    _series = null;
    _chart = null;
    _requestUpdate = null;
    attached(param) {
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
    setData(data) {
        this._data = data;
        if (this._series && this._chart) {
            this._paneViews = [new TrendShadingPaneView(this._data, this._series, this._chart)];
            if (this._requestUpdate) {
                this._requestUpdate();
            }
        }
    }
}
