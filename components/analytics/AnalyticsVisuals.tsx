interface DailyAnalyticsPoint {
  day: string;
  page_views: number;
  appointment_requests: number;
}

const chartWidth = 760;
const chartHeight = 118;
const chartLeft = 44;
const chartRight = chartWidth - 12;
const chartTop = 14;
const chartBottom = chartHeight - 24;

function dateLabel(value: string): string {
  const [, month, day] = value.split("-");
  return `${month}/${day}`;
}

function TrendPlot({
  title,
  values,
  color,
  fill,
  dates,
  tickIndices,
}: {
  title: string;
  values: number[];
  color: string;
  fill: string;
  dates: string[];
  tickIndices: number[];
}) {
  const max = Math.max(1, ...values);
  const x = (index: number) => chartLeft + (values.length < 2 ? 0 : index / (values.length - 1)) * (chartRight - chartLeft);
  const y = (value: number) => chartBottom - (value / max) * (chartBottom - chartTop);
  const line = values.map((value, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(value)}`).join(" ");
  const area = `${line} L ${x(values.length - 1)} ${chartBottom} L ${x(0)} ${chartBottom} Z`;

  return (
    <figure className="min-w-0">
      <figcaption className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-cms-text">{title}</span>
        <span className="text-xs text-cms-muted">Daily total</span>
      </figcaption>
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="block h-32 w-full overflow-visible"
        role="img"
        aria-label={`${title} daily trend chart`}
      >
        <title>{title} daily trend</title>
        <desc>{`Daily totals for the selected analytics period. The vertical scale runs from zero to ${max}.`}</desc>
        {[0, 0.5, 1].map((fraction) => {
          const guideY = chartBottom - fraction * (chartBottom - chartTop);
          const guideValue = Math.round(max * fraction);
          return (
            <g key={fraction}>
              <line x1={chartLeft} x2={chartRight} y1={guideY} y2={guideY} stroke="#e2ddd0" strokeDasharray="3 5" />
              <text x={chartLeft - 8} y={guideY + 4} textAnchor="end" fill="#786f66" fontSize="11">{guideValue}</text>
            </g>
          );
        })}
        <path d={area} fill={fill} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {values.map((value, index) => (
          <circle key={index} cx={x(index)} cy={y(value)} r={values.length <= 14 || index === values.length - 1 ? 3 : 1.5} fill={color}>
            <title>{`${dates[index]}: ${value}`}</title>
          </circle>
        ))}
        {tickIndices.map((index) => (
          <text key={index} x={x(index)} y={chartHeight - 3} textAnchor={index === 0 ? "start" : index === values.length - 1 ? "end" : "middle"} fill="#786f66" fontSize="11">
            {dateLabel(dates[index])}
          </text>
        ))}
      </svg>
    </figure>
  );
}

export function AnalyticsTrendCharts({ days }: { days: DailyAnalyticsPoint[] }) {
  if (!days.length) {
    return <p className="p-5 text-sm text-cms-muted">Daily trend data is unavailable.</p>;
  }
  const dates = days.map((point) => point.day);
  const views = days.map((point) => point.page_views);
  const requests = days.map((point) => point.appointment_requests);
  const tickIndices = [...new Set([0, Math.floor((dates.length - 1) / 2), dates.length - 1])];

  return (
    <div className="grid gap-6 p-5 lg:grid-cols-2">
      <TrendPlot title="Anonymous page views" values={views} color="#8d6b57" fill="rgba(141, 107, 87, 0.12)" dates={dates} tickIndices={tickIndices} />
      <TrendPlot title="Appointment requests" values={requests} color="#3f6b52" fill="rgba(63, 107, 82, 0.12)" dates={dates} tickIndices={tickIndices} />
    </div>
  );
}

export function PopularPageBars({
  pages,
  totalViews,
}: {
  pages: { page_path: string; views: number }[];
  totalViews: number;
}) {
  const maximum = Math.max(1, ...pages.map((page) => page.views));
  if (!pages.length) {
    return <p className="p-5 text-sm text-cms-muted">No opted-in page views have been recorded yet.</p>;
  }

  return (
    <ol className="divide-y divide-cms-border">
      {pages.map((page) => {
        const share = totalViews ? (page.views / totalViews) * 100 : 0;
        return (
          <li key={page.page_path} className="space-y-2 px-5 py-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-cms-text">{page.page_path}</span>
              <span className="shrink-0 font-semibold text-cms-text">{page.views} <span className="font-normal text-cms-muted">({share.toFixed(1)}%)</span></span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-cms-background"
              role="img"
              aria-label={`${page.page_path}: ${page.views} views, ${share.toFixed(1)} percent of page views`}
            >
              <div className="h-full rounded-full bg-cms-primary" style={{ width: `${(page.views / maximum) * 100}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
