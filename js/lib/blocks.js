import d3 from 'd3';

import renderBlock from './renderblock';
import { exceptions, titleExceptions } from './exceptions';
import barChart from './barchart';
import buildTimeSeries from './timeseries';
import formatters from './formatters';
import transformers from './transformers';

/*
 * Define block renderers for each of the different data types.
 */
export default {

  // the realtime block is just `data.totals.active_visitors` formatted with commas
  realtime: renderBlock.loadAndRender()
    .render((selection, data) => {
      const totals = data.data[0];
      selection.text(formatters.addCommas(+totals.active_visitors));
    }),

  today: renderBlock.loadAndRender()
    .transform(data => data)
    .render((svg, data) => {
      const days = data.data;
      days.forEach((d) => {
        d.visits = +d.visits;
      });

      const y = function (d) { return d.visits; };


      const series = buildTimeSeries()
        .series([data.data])
        .y(y)
        .label(d => formatters.formatHour(d.hour))
        .title(d => `${formatters.addCommas(d.visits)} visits during the hour of ${formatters.formatHour(d.hour)}m`);

      series.xScale()
        .domain(d3.range(0, days.length + 1));

      series.yScale()
        .domain([0, d3.max(days, y)]);

      series.yAxis()
        .tickFormat(formatters.formatVisits());

      svg.call(series);
    }),

  // the OS block is a stack layout
  os: renderBlock.buildBarBasicChart('os'),

  // the windows block is a stack layout
  windows: renderBlock.buildBarBasicChart('os_version'),

  // the devices block is a stack layout
  devices: renderBlock.loadAndRender()
    .transform((d) => {
      const devices = transformers.listify(d.totals.devices);
      return transformers.findProportionsOfMetricFromValue(devices);
    })
    .render(barChart()
      .value(d => d.proportion)
      .format(formatters.floatToPercent))
    .on('render', (selection, data) => {
      /*
         * XXX this is an optimization. Rather than loading
         * users.json, we total up the device numbers to get the "big
         * number", saving us an extra XHR load.
         */
      const total = d3.sum(data.map(d => d.value));
      d3.select('#total_visitors')
        .text(formatters.readableBigNumber(total));
    }),

  // the browsers block is a table
  browsers: renderBlock.buildBarBasicChart('browser'),

  // the IE block is a stack, but with some extra work done to transform the
  // data beforehand to match the expected object format
  ie: renderBlock.buildBarBasicChart('ie_version'),

  cities: renderBlock.buildBarChartWithLabel((d) => {
    // remove "(not set) from the data"
    const cityList = d.data;
    const cityListFiltered = cityList.filter(c => (c.city !== '(not set)') && (c.city !== 'zz'));
    const proportions = transformers.findProportionsOfMetric(
      cityListFiltered,
      list => list.map(x => x.active_visitors),
    );
    return proportions.slice(0, 10);
  }, 'city'),

  counties: renderBlock.buildBarChartWithLabel((d) => {
    const values = transformers.findProportionsOfMetric(
      d.data,
      list => list.map(x => x.active_visitors),
    );
    return values.slice(0, 15);
  }, 'county'),

  'top-documents': renderBlock.loadAndRender()
    .transform(d => d.data)
    .on('render', (selection) => {
      // turn the labels into links
      selection.selectAll('.label')
        .each(function (d) {
          d.text = this.innerText;
        })
        .html('')
        .append('a')
        .attr('target', '_blank')
        .attr('href', d => d['ga:eventAction'])
        .text(d => {
          const rawTitle = titleExceptions[d['ga:eventAction']] || d['ga:eventAction'];
          const splitTitle = rawTitle.split('/');
          return splitTitle[splitTitle.length - 1];
        });
    })
    .render(barChart()
      .label(d => d['ga:eventAction'])
      .value(d => +d.total_events)
      .scale(values => d3.scale.linear()
        .domain([0, 1, d3.max(values)])
        .rangeRound([0, 1, 100]))
      .format(formatters.addCommas)),

  'top-documents-realtime': renderBlock.loadAndRender()
    .transform(d => d.data)
    .on('render', (selection) => {
      // turn the labels into links
      selection.selectAll('.label')
        .each(function (d) {
          d.text = this.innerText;
        })
        .html('')
        .append('a')
        .attr('target', '_blank')
        .attr('href', d => d['rt:eventAction'])
        .text(d => {
          const rawTitle = titleExceptions[d['rt:eventAction']] || d['rt:eventAction'];
          const splitTitle = rawTitle.split('/');
          return splitTitle[splitTitle.length - 1];
        });
    })
    .render(barChart()
      .label(d => d['rt:eventAction'])
      .value(d => +d.total_events)
      .scale(values => d3.scale.linear()
        .domain([0, 1, d3.max(values)])
        .rangeRound([0, 1, 100]))
      .format(formatters.addCommas)),

  // the top pages block(s)
  'top-pages': renderBlock.loadAndRender()
    .transform(d => d.data)
    .on('render', (selection) => {
      // turn the labels into links
      selection.selectAll('.label')
        .each(function (d) {
          d.text = this.innerText;
        })
        .html('')
        .text(d => titleExceptions[d.page_title] || d.page_title);
    })
    .render(barChart()
      .label(d => d.domain)
      .value(d => +d.pageviews)
      .scale(values => d3.scale.linear()
        .domain([0, 1, d3.max(values)])
        .rangeRound([0, 1, 100]))
      .format(formatters.addCommas)),

  // the top pages block(s)
  'top-pages-realtime': renderBlock.loadAndRender()
    .transform(d => d.data)
    .on('render', (selection) => {
      // turn the labels into links
      selection.selectAll('.label')
        .each(function (d) {
          d.text = this.innerText;
        })
        .html('')
        .text(d => titleExceptions[d.page] || d.page_title);
    })
    .render(barChart()
      .label(d => d.page_title)
      .value(d => +d['rt:pageviews'])
      .scale(values => d3.scale.linear()
        .domain([0, 1, d3.max(values)])
        .rangeRound([0, 1, 100]))
      .format(formatters.addCommas)),

};
