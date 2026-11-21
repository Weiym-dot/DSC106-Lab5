import * as d3
  from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

import scrollama
  from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';


// =====================================
// Global variables
// =====================================

let xScale;

let yScale;

let commits;

let filteredCommits;


// Lab 8 slider

let commitProgress = 100;

let timeScale;

let commitMaxTime;


// Lab 6 brushing

let brushBehavior;

let brushGroup;


// Lab 8 technology colors

const colors =
  d3.scaleOrdinal(
    d3.schemeTableau10
  );



// =====================================
// Load line-level data
// =====================================

async function loadData() {

  const data =
    await d3.csv(
      'loc.csv',

      (row) => ({

        ...row,

        line:
          Number(
            row.line
          ),

        depth:
          Number(
            row.depth
          ),

        length:
          Number(
            row.length
          ),

        date:
          new Date(
            row.date +
            'T00:00' +
            row.timezone
          ),

        datetime:
          new Date(
            row.datetime
          ),

      })
    );


  return data;
}



// =====================================
// Convert line-level data
// into commit-level data
// =====================================

function processCommits(
  data
) {

  return d3

    .groups(
      data,

      (d) =>
        d.commit
    )

    .map(
      ([commit, lines]) => {

        const first =
          lines[0];


        const {

          author,

          date,

          time,

          timezone,

          datetime,

        } = first;


        const ret = {

          id:
            commit,

          url:
            'https://github.com/Weiym-dot/DSC106-Lab5/commit/'
            + commit,

          author,

          date,

          time,

          timezone,

          datetime,


          // Example:
          // 14:30 -> 14.5

          hourFrac:
            datetime.getHours()
            +
            datetime.getMinutes()
            / 60,


          totalLines:
            lines.length,

        };


        // Store original line-level
        // data for later visualizations.

        Object.defineProperty(

          ret,

          'lines',

          {

            value:
              lines,

            enumerable:
              false,

            writable:
              false,

            configurable:
              false,

          }

        );


        return ret;

      }
    )


    // Lab 8 Step 3:
    // Scroll story must follow
    // chronological order.

    .sort(
      (a, b) =>
        a.datetime -
        b.datetime
    );
}



// =====================================
// Statistics helper
// =====================================

function addStat(
  dl,
  label,
  value
) {

  const stat =
    dl

      .append(
        'div'
      )

      .attr(
        'class',
        'stat'
      );


  stat

    .append(
      'dt'
    )

    .html(
      label
    );


  stat

    .append(
      'dd'
    )

    .text(
      value
    );
}



// =====================================
// Render summary statistics
// =====================================

function renderCommitInfo(
  data,
  commitsGiven
) {

  const stats =
    d3.select(
      '#stats'
    );


  stats
    .selectAll('*')
    .remove();


  const dl =
    stats

      .append(
        'dl'
      )

      .attr(
        'class',
        'stats'
      );


  // Total LOC

  addStat(

    dl,

    'Total <abbr title="Lines of code">LOC</abbr>',

    data.length

  );


  // Total commits

  addStat(

    dl,

    'Total commits',

    commitsGiven.length

  );


  // Number of files

  const numberOfFiles =
    d3

      .group(
        data,
        (d) => d.file
      )

      .size;


  addStat(

    dl,

    'Number of files',

    numberOfFiles

  );


  // Average line length

  const averageLineLength =
    data.length

      ? d3.mean(
          data,
          (d) => d.length
        )

      : 0;


  addStat(

    dl,

    'Average line length',

    averageLineLength
      .toFixed(1)

  );


  // Maximum depth

  const maxDepth =
    data.length

      ? d3.max(
          data,
          (d) => d.depth
        )

      : 0;


  addStat(

    dl,

    'Maximum depth',

    maxDepth

  );


  // Most active day

  const workByDay =
    d3.rollups(

      commitsGiven,

      (v) =>
        v.length,

      (d) =>
        d.datetime
          .toLocaleString(
            'en',

            {
              weekday:
                'long'
            }
          )

    );


  const mostActiveDay =
    d3.greatest(

      workByDay,

      (d) =>
        d[1]

    )?.[0]
    ?? 'N/A';


  addStat(

    dl,

    'Most active day',

    mostActiveDay

  );
}



// =====================================
// Tooltip content
// =====================================

function renderTooltipContent(
  commit
) {

  if (
    !commit ||
    Object.keys(
      commit
    ).length === 0
  ) {

    return;

  }


  const link =
    document.getElementById(
      'commit-link'
    );


  const date =
    document.getElementById(
      'commit-date'
    );


  // Lab 8:
  // renamed to avoid duplicate id

  const time =
    document.getElementById(
      'commit-time-tooltip'
    );


  const author =
    document.getElementById(
      'commit-author'
    );


  const lines =
    document.getElementById(
      'commit-lines'
    );


  link.href =
    commit.url;


  link.textContent =
    commit.id;


  date.textContent =
    commit.datetime
      ?.toLocaleString(
        'en',

        {
          dateStyle:
            'full'
        }
      );


  time.textContent =
    commit.datetime
      ?.toLocaleString(
        'en',

        {
          timeStyle:
            'short'
        }
      );


  author.textContent =
    commit.author;


  lines.textContent =
    commit.totalLines;
}



// =====================================
// Tooltip visibility
// =====================================

function updateTooltipVisibility(
  isVisible
) {

  const tooltip =
    document.getElementById(
      'commit-tooltip'
    );


  tooltip.hidden =
    !isVisible;
}



// =====================================
// Tooltip position
// =====================================

function updateTooltipPosition(
  event
) {

  const tooltip =
    document.getElementById(
      'commit-tooltip'
    );


  tooltip.style.left =
    `${event.clientX + 15}px`;


  tooltip.style.top =
    `${event.clientY + 15}px`;
}



// =====================================
// Check whether a commit lies
// inside the brush rectangle
// =====================================

function isCommitSelected(
  selection,
  commit
) {

  if (!selection) {

    return false;

  }


  const [
    x0,
    x1
  ] =
    selection.map(
      (d) =>
        d[0]
    );


  const [
    y0,
    y1
  ] =
    selection.map(
      (d) =>
        d[1]
    );


  const x =
    xScale(
      commit.datetime
    );


  const y =
    yScale(
      commit.hourFrac
    );


  return (

    x >= x0 &&

    x <= x1 &&

    y >= y0 &&

    y <= y1

  );
}



// =====================================
// Selection count
// =====================================

function renderSelectionCount(
  selection
) {

  const selectedCommits =
    selection

      ? filteredCommits.filter(

          (d) =>
            isCommitSelected(
              selection,
              d
            )

        )

      : [];


  const countElement =
    document.querySelector(
      '#selection-count'
    );


  countElement.textContent =
    `${
      selectedCommits.length
      || 'No'
    } commits selected`;


  return selectedCommits;
}



// =====================================
// Language breakdown
// =====================================

function renderLanguageBreakdown(
  selection
) {

  const selectedCommits =
    selection

      ? filteredCommits.filter(

          (d) =>
            isCommitSelected(
              selection,
              d
            )

        )

      : [];


  const container =
    document.getElementById(
      'language-breakdown'
    );


  if (
    selectedCommits.length
    === 0
  ) {

    container.innerHTML =
      '';

    return;

  }


  const lines =
    selectedCommits.flatMap(

      (d) =>
        d.lines

    );


  const breakdown =
    d3.rollup(

      lines,

      (v) =>
        v.length,

      (d) =>
        d.type

    );


  container.innerHTML =
    '';


  for (
    const [
      language,
      count
    ]
    of breakdown
  ) {

    const proportion =
      count
      /
      lines.length;


    const formatted =
      d3.format(
        '.1~%'
      )(
        proportion
      );


    container.innerHTML += `
      <div class="stat">

        <dt>
          ${language}
        </dt>

        <dd>
          ${count} lines
          (${formatted})
        </dd>

      </div>
    `;
  }
}



// =====================================
// Brush event
// =====================================

function brushed(
  event
) {

  const selection =
    event.selection;


  d3

    .select(
      '#chart'
    )

    .selectAll(
      'circle'
    )

    .classed(

      'selected',

      (d) =>
        isCommitSelected(
          selection,
          d
        )

    );


  renderSelectionCount(
    selection
  );


  renderLanguageBreakdown(
    selection
  );
}



// =====================================
// Create brush selector
// =====================================

function createBrushSelector(
  svg,
  usableArea
) {

  brushBehavior =
    d3

      .brush()

      .extent([

        [

          usableArea.left,

          usableArea.top

        ],

        [

          usableArea.right,

          usableArea.bottom

        ]

      ])

      .on(
        'start brush end',
        brushed
      );


  brushGroup =
    svg

      .append(
        'g'
      )

      .attr(
        'class',
        'brush'
      )

      .call(
        brushBehavior
      );


  // Keep circles above brush overlay

  svg

    .select(
      '.dots'
    )

    .raise();
}



// =====================================
// Render initial scatter plot
// =====================================

function renderScatterPlot(
  data,
  commitsGiven
) {

  const width =
    1000;


  const height =
    600;


  const margin = {

    top:
      10,

    right:
      10,

    bottom:
      30,

    left:
      50,

  };


  const usableArea = {

    top:
      margin.top,

    right:
      width
      -
      margin.right,

    bottom:
      height
      -
      margin.bottom,

    left:
      margin.left,

    width:
      width
      -
      margin.left
      -
      margin.right,

    height:
      height
      -
      margin.top
      -
      margin.bottom,

  };


  // -----------------------------------
  // SVG
  // -----------------------------------

  const svg =
    d3

      .select(
        '#chart'
      )

      .append(
        'svg'
      )

      .attr(
        'viewBox',
        `0 0 ${width} ${height}`
      )

      .style(
        'overflow',
        'visible'
      );


  // -----------------------------------
  // Scales
  // -----------------------------------

  xScale =
    d3

      .scaleTime()

      .domain(
        d3.extent(

          commitsGiven,

          (d) =>
            d.datetime

        )
      )

      .range([

        usableArea.left,

        usableArea.right

      ])

      .nice();


  yScale =
    d3

      .scaleLinear()

      .domain([
        0,
        24
      ])

      .range([

        usableArea.bottom,

        usableArea.top

      ]);


  // -----------------------------------
  // Radius scale
  // -----------------------------------

  const [
    minLines,
    maxLines
  ] =
    d3.extent(

      commitsGiven,

      (d) =>
        d.totalLines

    );


  const safeMin =
    minLines ?? 0;


  const safeMax =
    maxLines === safeMin

      ? safeMin + 1

      : maxLines;


  const rScale =
    d3

      .scaleSqrt()

      .domain([

        safeMin,

        safeMax

      ])

      .range([
        2,
        30
      ]);


  const sortedCommits =
    d3.sort(

      commitsGiven,

      (d) =>
        -d.totalLines

    );


  // -----------------------------------
  // Grid lines
  // -----------------------------------

  const gridlines =
    svg

      .append(
        'g'
      )

      .attr(
        'class',
        'gridlines'
      )

      .attr(

        'transform',

        `translate(
          ${usableArea.left},
          0
        )`

      );


  gridlines.call(

    d3

      .axisLeft(
        yScale
      )

      .tickFormat(
        ''
      )

      .tickSize(
        -usableArea.width
      )

  );


  // -----------------------------------
  // Dots
  // -----------------------------------

  const dots =
    svg

      .append(
        'g'
      )

      .attr(
        'class',
        'dots'
      );


  dots

    .selectAll(
      'circle'
    )


    // Lab 8 Step 1.3:
    // use commit id as a stable key

    .data(
      sortedCommits,

      (d) =>
        d.id
    )


    .join(
      'circle'
    )


    .attr(

      'cx',

      (d) =>
        xScale(
          d.datetime
        )

    )


    .attr(

      'cy',

      (d) =>
        yScale(
          d.hourFrac
        )

    )


    .attr(

      'r',

      (d) =>
        rScale(
          d.totalLines
        )

    )


    .attr(
      'fill',
      'steelblue'
    )


    .style(
      'fill-opacity',
      0.7
    )


    .on(

      'mouseenter',

      (event, commit) => {

        d3

          .select(
            event.currentTarget
          )

          .style(
            'fill-opacity',
            1
          );


        renderTooltipContent(
          commit
        );


        updateTooltipVisibility(
          true
        );


        updateTooltipPosition(
          event
        );

      }

    )


    .on(

      'mousemove',

      (event) => {

        updateTooltipPosition(
          event
        );

      }

    )


    .on(

      'mouseleave',

      (event) => {

        d3

          .select(
            event.currentTarget
          )

          .style(
            'fill-opacity',
            0.7
          );


        updateTooltipVisibility(
          false
        );

      }

    );


  // -----------------------------------
  // Axes
  // -----------------------------------

  const xAxis =
    d3.axisBottom(
      xScale
    );


  const yAxis =
    d3

      .axisLeft(
        yScale
      )

      .tickFormat(

        (d) =>

          String(
            d % 24
          )

            .padStart(
              2,
              '0'
            )

          +
          ':00'

      );


  // X-axis

  svg

    .append(
      'g'
    )

    .attr(

      'transform',

      `translate(
        0,
        ${usableArea.bottom}
      )`

    )

    // Lab 8:
    // mark axis so we can update it.

    .attr(
      'class',
      'x-axis'
    )

    .call(
      xAxis
    );


  // Y-axis

  svg

    .append(
      'g'
    )

    .attr(

      'transform',

      `translate(
        ${usableArea.left},
        0
      )`

    )

    .attr(
      'class',
      'y-axis'
    )

    .call(
      yAxis
    );


  // Lab 6 brush

  createBrushSelector(
    svg,
    usableArea
  );
}



// =====================================
// Lab 8 Step 1.2
// Update existing scatter plot
// =====================================

function updateScatterPlot(
  data,
  commitsGiven
) {

  if (
    commitsGiven.length
    === 0
  ) {

    return;

  }


  const width =
    1000;


  const height =
    600;


  const margin = {

    top:
      10,

    right:
      10,

    bottom:
      30,

    left:
      50,

  };


  const usableArea = {

    top:
      margin.top,

    right:
      width
      -
      margin.right,

    bottom:
      height
      -
      margin.bottom,

    left:
      margin.left,

    width:
      width
      -
      margin.left
      -
      margin.right,

    height:
      height
      -
      margin.top
      -
      margin.bottom,

  };


  const svg =
    d3

      .select(
        '#chart'
      )

      .select(
        'svg'
      );


  // -----------------------------------
  // Update x-scale
  // -----------------------------------

  let extent =
    d3.extent(

      commitsGiven,

      (d) =>
        d.datetime

    );


  // If only one commit is visible,
  // prevent a zero-width time scale.

  if (
    extent[0].getTime()
    ===
    extent[1].getTime()
  ) {

    const oneDay =
      24
      *
      60
      *
      60
      *
      1000;


    extent = [

      new Date(
        extent[0].getTime()
        -
        oneDay
      ),

      new Date(
        extent[1].getTime()
        +
        oneDay
      )

    ];
  }


  xScale

    .domain(
      extent
    )

    .nice();


  // -----------------------------------
  // New radius scale
  // -----------------------------------

  const [
    minLines,
    maxLines
  ] =
    d3.extent(

      commitsGiven,

      (d) =>
        d.totalLines

    );


  const safeMin =
    minLines ?? 0;


  const safeMax =
    maxLines === safeMin

      ? safeMin + 1

      : maxLines;


  const rScale =
    d3

      .scaleSqrt()

      .domain([

        safeMin,

        safeMax

      ])

      .range([
        2,
        30
      ]);


  // -----------------------------------
  // Update x-axis
  // -----------------------------------

  const xAxis =
    d3.axisBottom(
      xScale
    );


  const xAxisGroup =
    svg.select(
      'g.x-axis'
    );


  xAxisGroup

    .selectAll('*')

    .remove();


  xAxisGroup

    .call(
      xAxis
    );


  // -----------------------------------
  // Update circles
  // -----------------------------------

  const dots =
    svg.select(
      'g.dots'
    );


  const sortedCommits =
    d3.sort(

      commitsGiven,

      (d) =>
        -d.totalLines

    );


  dots

    .selectAll(
      'circle'
    )


    // Lab 8 Step 1.3:
    // keyed join

    .data(
      sortedCommits,

      (d) =>
        d.id
    )


    .join(
      'circle'
    )


    .attr(

      'cx',

      (d) =>
        xScale(
          d.datetime
        )

    )


    .attr(

      'cy',

      (d) =>
        yScale(
          d.hourFrac
        )

    )


    .attr(

      'r',

      (d) =>
        rScale(
          d.totalLines
        )

    )


    .attr(
      'fill',
      'steelblue'
    )


    .style(
      'fill-opacity',
      0.7
    )


    .on(

      'mouseenter',

      (event, commit) => {

        d3

          .select(
            event.currentTarget
          )

          .style(
            'fill-opacity',
            1
          );


        renderTooltipContent(
          commit
        );


        updateTooltipVisibility(
          true
        );


        updateTooltipPosition(
          event
        );

      }

    )


    .on(

      'mousemove',

      (event) => {

        updateTooltipPosition(
          event
        );

      }

    )


    .on(

      'mouseleave',

      (event) => {

        d3

          .select(
            event.currentTarget
          )

          .style(
            'fill-opacity',
            0.7
          );


        updateTooltipVisibility(
          false
        );

      }

    );


  // Keep dots above brush overlay

  dots.raise();
}



// =====================================
// Lab 8 Step 2
// File unit visualization
// =====================================

function updateFileDisplay(
  commitsGiven
) {

  // Get all line-level data
  // from visible commits.

  const lines =
    commitsGiven.flatMap(

      (d) =>
        d.lines

    );


  // Group lines by file.

  const files =
    d3

      .groups(

        lines,

        (d) =>
          d.file

      )

      .map(

        ([name, lines]) => ({

          name,

          lines,

        })

      )


      // Lab 8 Step 2.3:
      // biggest file first

      .sort(

        (a, b) =>
          b.lines.length
          -
          a.lines.length

      );


  const filesContainer =
    d3

      .select(
        '#files'
      )

      .selectAll(
        ':scope > div'
      )

      .data(

        files,

        (d) =>
          d.name

      )

      .join(

        (enter) =>

          enter

            .append(
              'div'
            )

            .call(

              (div) => {

                const dt =
                  div

                    .append(
                      'dt'
                    );


                dt

                  .append(
                    'code'
                  );


                dt

                  .append(
                    'small'
                  );


                div

                  .append(
                    'dd'
                  );

              }

            ),

        (update) =>
          update,

        (exit) =>
          exit.remove()

      );


  // Filename

  filesContainer

    .select(
      'dt > code'
    )

    .text(

      (d) =>
        d.name

    );


  // Number of lines

  filesContainer

    .select(
      'dt > small'
    )

    .text(

      (d) =>
        `${d.lines.length} lines`

    );


  // Lab 8 Step 2.2:
  // one dot per code line

  filesContainer

    .select(
      'dd'
    )

    .selectAll(
      '.loc'
    )

    .data(

      (d) =>
        d.lines,

      (d) =>
        `${d.commit}-${d.file}-${d.line}`

    )

    .join(
      'div'
    )

    .attr(
      'class',
      'loc'
    )


    // Lab 8 Step 2.4:
    // color by technology

    .style(

      '--color',

      (d) =>
        colors(
          d.type
        )

    );
}



// =====================================
// Lab 8 Step 1
// Slider
// =====================================

function updateTimeDisplay() {

  d3

    .select(
      '#commit-time'
    )

    .text(

      commitMaxTime
        .toLocaleString(

          'en',

          {

            dateStyle:
              'long',

            timeStyle:
              'short',

          }

        )

    );
}



// =====================================
// Update all visualizations
// =====================================

function updateEverything() {

  filteredCommits =
    commits.filter(

      (d) =>
        d.datetime
        <=
        commitMaxTime

    );


  // There should always be at least
  // one commit at slider minimum,
  // but this protects against
  // unexpected data.

  if (
    filteredCommits.length
    === 0
  ) {

    filteredCommits =
      [commits[0]];

  }


  const filteredLines =
    filteredCommits.flatMap(

      (d) =>
        d.lines

    );


  updateScatterPlot(

    filteredLines,

    filteredCommits

  );


  renderCommitInfo(

    filteredLines,

    filteredCommits

  );


  updateFileDisplay(
    filteredCommits
  );


  updateTimeDisplay();


  // Reset brushing when timeline changes.

  if (
    brushGroup &&
    brushBehavior
  ) {

    brushGroup.call(

      brushBehavior.move,

      null

    );

  }
}



// =====================================
// Slider change handler
// =====================================

function onTimeSliderChange() {

  commitProgress =
    Number(

      d3

        .select(
          '#commit-progress'
        )

        .property(
          'value'
        )

    );


  commitMaxTime =
    timeScale.invert(
      commitProgress
    );


  updateEverything();
}



// =====================================
// Lab 8 Step 3
// Generate narrative text
// =====================================

function renderScatterStory() {

  d3

    .select(
      '#scatter-story'
    )

    .selectAll(
      '.step'
    )

    .data(

      commits,

      (d) =>
        d.id

    )

    .join(
      'div'
    )

    .attr(
      'class',
      'step'
    )

    .html(

      (d, i) => {

        const fileCount =
          d3.rollups(

            d.lines,

            (D) =>
              D.length,

            (line) =>
              line.file

          ).length;


        return `

          <p>

            On

            <strong>

              ${

                d.datetime
                  .toLocaleString(

                    'en',

                    {

                      dateStyle:
                        'full',

                      timeStyle:
                        'short',

                    }

                  )

              }

            </strong>,

            I made

            <a
              href="${d.url}"
              target="_blank"
            >

              ${

                i > 0

                  ? 'another commit'

                  : 'my first commit'

              }

            </a>.

          </p>


          <p>

            I edited

            <strong>
              ${d.totalLines}
            </strong>

            lines across

            <strong>
              ${fileCount}
            </strong>

            files.

          </p>

        `;

      }

    );
}



// =====================================
// Lab 8 Step 3.3
// Scrollama callback
// =====================================

function onStepEnter(
  response
) {

  const commit =
    response.element
      .__data__;


  if (!commit) {

    return;

  }


  // Update timeline to current
  // narrative commit.

  commitMaxTime =
    commit.datetime;


  commitProgress =
    timeScale(
      commitMaxTime
    );


  // Synchronize slider.

  d3

    .select(
      '#commit-progress'
    )

    .property(
      'value',
      commitProgress
    );


  updateEverything();


  // Highlight current narrative step.

  d3

    .selectAll(
      '#scatter-story .step'
    )

    .classed(
      'active',
      false
    );


  d3

    .select(
      response.element
    )

    .classed(
      'active',
      true
    );
}



// =====================================
// Run everything
// =====================================

const data =
  await loadData();


commits =
  processCommits(
    data
  );


filteredCommits =
  commits;


// -------------------------------------
// Create Lab 8 time scale
// -------------------------------------

timeScale =
  d3

    .scaleTime()

    .domain([

      d3.min(

        commits,

        (d) =>
          d.datetime

      ),

      d3.max(

        commits,

        (d) =>
          d.datetime

      )

    ])

    .range([
      0,
      100
    ]);


commitMaxTime =
  timeScale.invert(
    commitProgress
  );


// -------------------------------------
// Initial render
// -------------------------------------

renderCommitInfo(
  data,
  commits
);


renderScatterPlot(
  data,
  commits
);


updateFileDisplay(
  commits
);


updateTimeDisplay();


// -------------------------------------
// Slider listener
// -------------------------------------

d3

  .select(
    '#commit-progress'
  )

  .on(
    'input',
    onTimeSliderChange
  );


// -------------------------------------
// Generate story
// -------------------------------------

renderScatterStory();


// -------------------------------------
// Initialize Scrollama
// -------------------------------------

const scroller =
  scrollama();


scroller

  .setup({

    container:
      '#scrolly-1',

    step:
      '#scrolly-1 .step',

    offset:
      0.5,

  })

  .onStepEnter(
    onStepEnter
  );


// Keep Scrollama dimensions correct
// when browser is resized.

window.addEventListener(

  'resize',

  () =>
    scroller.resize()

);