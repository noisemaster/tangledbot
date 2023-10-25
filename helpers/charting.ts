import vega from 'vega';
import vegaLite from 'vega-lite';
import sharp from 'sharp';

const compiled = vegaLite.compile({
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    description: 'A simple bar chart with embedded data.',
    width: 1280/2,
    height: 720/2,
    data: {
        values: [
            { "date": "2009-06-01", "open": 28.7, "high": 30.05, "low": 28.45, "close": 30.04, },
            { "date": "2009-06-02", "open": 30.04, "high": 30.13, "low": 28.3, "close": 29.63, },
            { "date": "2009-06-03", "open": 29.62, "high": 31.79, "low": 29.62, "close": 31.02, },
        ],
    },
    encoding: {
        x: {
            field: "date",
            type: "temporal",
            axis: {
                format: "%m/%d",
                labelAngle: -45,
            }
        },
        y: {
            type: "quantitative",
            scale: { zero: false },
            axis: { title: "Price" }
        },
        color: {
            condition: {
                test: "datum.open < datum.close",
                value: "#06982d"
            },
            value: "#ae1325"
        }
    },
    layer: [
        {
            mark: "rule",
            encoding: {
                y: { field: "low" },
                y2: { field: "high" }
            }
        },
        {
            mark: "bar",
            encoding: {
                y: { field: "open" },
                y2: { field: "close" }
            }
        }
    ]
}).spec;

const view = new vega
    .View(vega.parse(compiled))
    .renderer('none');

view.toSVG()
    .then(async svg => {
        await sharp(Buffer.from(svg))
            .toFormat('png')
            .toFile('candlestick.png')
    })
    .catch(err => {
        console.error(err);
    })

