import * as d3
  from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';


// =====================================
// Global variables
// Needed by Step 5 brushing
// =====================================

let xScale;
let yScale;
let commits;


// =====================================
// Step 1.1
// Load line-level data
// =====================================

async function loadData() {

  const data = await d3.csv(
    'loc.csv',

    (row) => ({
      ...row,

      line:
        Number(row.line),

      depth:
        Number(row.depth),

      length:
        Number(row.length),

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
// Step 1.2
// Convert line-level data
// into commit-level data
// =====================================

function processCommits(data) {

  return d3
    .groups(
      data,
      (d) => d.commit
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
          datetime
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


        // Keep original line-level data
        // for language breakdown later

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
    );
}


// =====================================
// Step 1.3
// Helper for statistics
// =====================================

function addStat(
  dl,
  label,
  value
) {

  const stat =
    dl
      .append('div')
      .attr(
        'class',
        'stat'
      );


  stat
    .append('dt')
    .html(
      label
    );


  stat
    .append('dd')
    .text(
      value
    );
}


// =====================================
// Step 1.3
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
      .append('dl')
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
    d3.mean(
      data,
      (d) => d.length
    );


  addStat(
    dl,

    'Average line length',

    averageLineLength.toFixed(1)
  );


  // Maximum depth

  const maxDepth =
    d3.max(
      data,
      (d) => d.depth
    );


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
        d.datetime.toLocaleString(
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
      (d) => d[1]
    )?.[0];


  addStat(
    dl,

    'Most active day',

    mostActiveDay
  );
}


// =====================================
// Step 3.1
// Update tooltip content
// =====================================

function renderTooltipContent(
  commit
) {

  if (
    !commit ||
    Object.keys(commit).length === 0
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

  const time =
    document.getElementById(
      'commit-time'
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
// Step 3.3
// Show / hide tooltip
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
// Step 3.4
// Position tooltip
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
// Step 5.4
// Test whether a commit lies
// inside the brush rectangle
// =====================================

function isCommitSelected(
  selection,
  commit
) {

  if (!selection) {
    return false;
  }


  // Brush selection:
  //
  // [
  //   [x0, y0],
  //   [x1, y1]
  // ]

  const [
    x0,
    x1
  ] =
    selection.map(
      (d) => d[0]
    );


  const [
    y0,
    y1
  ] =
    selection.map(
      (d) => d[1]
    );


  // Convert commit data
  // into SVG coordinates

  const x =
    xScale(
      commit.datetime
    );


  const y =
    yScale(
      commit.hourFrac
    );


  // Check whether the point
  // is inside the rectangle

  return (
    x >= x0 &&
    x <= x1 &&
    y >= y0 &&
    y <= y1
  );
}


// =====================================
// Step 5.5
// Show number of selected commits
// =====================================

function renderSelectionCount(
  selection
) {

  const selectedCommits =
    selection

      ? commits.filter(
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
      selectedCommits.length || 'No'
    } commits selected`;


  return selectedCommits;
}


// =====================================
// Step 5.6
// Show language breakdown
// =====================================

function renderLanguageBreakdown(
  selection
) {

  const selectedCommits =
    selection

      ? commits.filter(
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


  // Nothing selected:
  // clear the breakdown

  if (
    selectedCommits.length === 0
  ) {

    container.innerHTML =
      '';

    return;
  }


  // Get all individual code lines
  // belonging to selected commits

  const lines =
    selectedCommits.flatMap(
      (d) =>
        d.lines
    );


  // Count lines by language/type

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


  // Display each language

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
        <dt>${language}</dt>
        <dd>
          ${count} lines
          (${formatted})
        </dd>
      </div>
    `;
  }
}


// =====================================
// Step 5.4
// Called whenever brush changes
// =====================================

function brushed(
  event
) {

  const selection =
    event.selection;


  // Highlight selected dots

  d3
    .select('#chart')
    .selectAll('circle')

    .classed(
      'selected',

      (d) =>
        isCommitSelected(
          selection,
          d
        )
    );


  // Update selected count

  renderSelectionCount(
    selection
  );


  // Update language breakdown

  renderLanguageBreakdown(
    selection
  );
}


// =====================================
// Step 5.1 + Step 5.2
// Create brush
// =====================================

function createBrushSelector(
  svg,
  usableArea
) {

  const brush =
    d3
      .brush()

      // Restrict brushing
      // to plotting area

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

      // Listen continuously
      // while brushing

      .on(
        'start brush end',
        brushed
      );


  // Add brush to SVG

  svg.call(
    brush
  );


  // Brush creates an invisible overlay
  // that would block circle hover.
  //
  // Raise dots and following elements
  // above the overlay.

  svg
    .selectAll(
      '.dots, .overlay ~ *'
    )
    .raise();
}


// =====================================
// Step 2 + 3 + 4 + 5
// Render scatterplot
// =====================================

function renderScatterPlot(
  data,
  commitsGiven
) {


  // -----------------------------------
  // Chart dimensions
  // -----------------------------------

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
      - margin.right,

    bottom:
      height
      - margin.bottom,

    left:
      margin.left,

    width:
      width
      - margin.left
      - margin.right,

    height:
      height
      - margin.top
      - margin.bottom,
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


  // ===================================
  // Step 2.1
  // Scales
  //
  // Step 5 requires these to be
  // global variables.
  // ===================================

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


  // ===================================
  // Step 4
  // Radius scale
  // ===================================

  const [
    minLines,
    maxLines
  ] =
    d3.extent(
      commitsGiven,
      (d) =>
        d.totalLines
    );


  const rScale =
    d3
      .scaleSqrt()

      .domain([
        minLines,
        maxLines
      ])

      .range([
        2,
        30
      ]);


  // ===================================
  // Step 4.3
  // Large circles first
  // ===================================

  const sortedCommits =
    d3.sort(

      commitsGiven,

      (d) =>
        -d.totalLines
    );


  // ===================================
  // Step 2.3
  // Grid lines
  // ===================================

  const gridlines =
    svg
      .append('g')

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

      .tickFormat('')

      .tickSize(
        -usableArea.width
      )
  );


  // ===================================
  // Dots
  // ===================================

  const dots =
    svg
      .append('g')

      .attr(
        'class',
        'dots'
      );


  dots
    .selectAll(
      'circle'
    )

    .data(
      sortedCommits
    )

    .join(
      'circle'
    )


    // X = commit date

    .attr(
      'cx',

      (d) =>
        xScale(
          d.datetime
        )
    )


    // Y = time of day

    .attr(
      'cy',

      (d) =>
        yScale(
          d.hourFrac
        )
    )


    // Size = lines edited

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


    // =================================
    // Step 3 tooltip
    // =================================

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


  // ===================================
  // Step 2.2
  // Axes
  // ===================================

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
    .append('g')

    .attr(
      'transform',

      `translate(
        0,
        ${usableArea.bottom}
      )`
    )

    .call(
      xAxis
    );


  // Y-axis

  svg
    .append('g')

    .attr(
      'transform',

      `translate(
        ${usableArea.left},
        0
      )`
    )

    .call(
      yAxis
    );


  // ===================================
  // Step 5
  // Add brushing last
  // ===================================

  createBrushSelector(
    svg,
    usableArea
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


renderCommitInfo(
  data,
  commits
);


renderScatterPlot(
  data,
  commits
);