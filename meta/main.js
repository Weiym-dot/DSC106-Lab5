import * as d3
  from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';


// =====================================
// Step 1.1
// Load line-level data from loc.csv
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
  commits
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
    commits.length
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
    averageLineLength
      .toFixed(1)
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

      commits,

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


  // Commit link

  link.href =
    commit.url;

  link.textContent =
    commit.id;


  // Date

  date.textContent =
    commit.datetime
      ?.toLocaleString(
        'en',
        {
          dateStyle:
            'full'
        }
      );


  // Time

  time.textContent =
    commit.datetime
      ?.toLocaleString(
        'en',
        {
          timeStyle:
            'short'
        }
      );


  // Author

  author.textContent =
    commit.author;


  // Lines edited

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
// Move tooltip near mouse cursor
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
// Step 2 + Step 3
// Scatterplot
// =====================================

function renderScatterPlot(
  data,
  commits
) {


  // -----------------------------------
  // Chart dimensions
  // -----------------------------------

  const width =
    1000;

  const height =
    600;


  // -----------------------------------
  // Margins
  // -----------------------------------

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


  // -----------------------------------
  // Usable plot area
  // -----------------------------------

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
  // Create SVG
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
  // ===================================


  // X scale:
  // commit date

  const xScale =
    d3
      .scaleTime()

      .domain(
        d3.extent(
          commits,
          (d) =>
            d.datetime
        )
      )

      .range([
        usableArea.left,
        usableArea.right
      ])

      .nice();


  // Y scale:
  // time of day

  const yScale =
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
  // Step 2.3
  // Horizontal grid lines
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
  // Step 2.1 + Step 3
  // Draw interactive dots
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
      commits
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
      5
    )

    .attr(
      'fill',
      'steelblue'
    )


    // =================================
    // Step 3.3 + 3.4
    // Hover interaction
    // =================================

    .on(
      'mouseenter',

      (event, commit) => {

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


    // Optional improvement:
    // keep tooltip following mouse

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

      () => {

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
}


// =====================================
// Run everything
// =====================================

const data =
  await loadData();


const commits =
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