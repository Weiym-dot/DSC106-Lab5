import {
  fetchJSON,
  renderProjects
} from '../global.js';

import * as d3
  from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';


// --------------------------------
// Load project data
// --------------------------------

const projects =
  await fetchJSON('../lib/projects.json');

const projectsContainer =
  document.querySelector('.projects');

const projectsTitle =
  document.querySelector('.projects-title');

projectsTitle.textContent =
  `${projects.length} Projects`;


// --------------------------------
// Search setup
// --------------------------------

let query = '';

let searchInput =
  document.querySelector('.searchBar');


// --------------------------------
// Pie chart setup
// --------------------------------

let arcGenerator = d3
  .arc()
  .innerRadius(0)
  .outerRadius(50);

let colors =
  d3.scaleOrdinal(
    d3.schemeTableau10
  );


// --------------------------------
// Track selected pie slice
// --------------------------------

let selectedIndex = -1;


// --------------------------------
// Render pie chart + legend
// --------------------------------

function renderPieChart(projectsGiven) {

  // Group projects by year
  let newRolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year
  );

  // Convert to objects
  let newData =
    newRolledData.map(([year, count]) => {
      return {
        value: count,
        label: year
      };
    });


  // Calculate pie slices
  let newSliceGenerator =
    d3.pie()
      .value((d) => d.value);

  let newArcData =
    newSliceGenerator(newData);

  let newArcs =
    newArcData.map((d) =>
      arcGenerator(d)
    );


  // Select SVG
  let svg =
    d3.select('#projects-pie-plot');

  // Clear old paths
  svg
    .selectAll('path')
    .remove();


  // Select legend
  let legend =
    d3.select('.legend');

  // Clear old legend
  legend
    .selectAll('li')
    .remove();


  // --------------------------------
  // Draw pie slices
  // --------------------------------

  newArcs.forEach((arc, i) => {

    svg
      .append('path')
      .attr('d', arc)
      .attr('fill', colors(i))

      .attr(
        'class',
        selectedIndex === i
          ? 'selected'
          : ''
      )

      .on('click', () => {

        // Toggle selection
        selectedIndex =
          selectedIndex === i
            ? -1
            : i;


        // Update selected class on wedges
        svg
          .selectAll('path')
          .attr(
            'class',
            (_, idx) =>
              idx === selectedIndex
                ? 'selected'
                : ''
          );


        // Update selected class on legend
        legend
          .selectAll('li')
          .attr(
            'class',
            (_, idx) =>
              idx === selectedIndex
                ? 'legend-item selected'
                : 'legend-item'
          );


        // --------------------------------
        // Filter projects by selected year
        // --------------------------------

        if (selectedIndex === -1) {

          renderProjects(
            projectsGiven,
            projectsContainer,
            'h2'
          );

        } else {

          let selectedYear =
            newData[selectedIndex].label;

          let filteredProjects =
            projectsGiven.filter(
              (project) =>
                project.year === selectedYear
            );

          renderProjects(
            filteredProjects,
            projectsContainer,
            'h2'
          );

        }

      });

  });


  // --------------------------------
  // Draw legend
  // --------------------------------

  newData.forEach((d, idx) => {

    legend
      .append('li')
      .attr(
        'style',
        `--color:${colors(idx)}`
      )
      .attr(
        'class',
        idx === selectedIndex
          ? 'legend-item selected'
          : 'legend-item'
      )
      .html(
        `<span class="swatch"></span>
         ${d.label}
         <em>(${d.value})</em>`
      );

  });

}


// --------------------------------
// Initial render
// --------------------------------

renderProjects(
  projects,
  projectsContainer,
  'h2'
);

renderPieChart(projects);


// --------------------------------
// Search functionality
// --------------------------------

searchInput.addEventListener(
  'input',
  (event) => {

    query =
      event.target.value;

    let filteredProjects =
      projects.filter((project) => {

        let values =
          Object
            .values(project)
            .join('\n')
            .toLowerCase();

        return values.includes(
          query.toLowerCase()
        );

      });


    // Reset pie selection whenever
    // search changes
    selectedIndex = -1;


    renderProjects(
      filteredProjects,
      projectsContainer,
      'h2'
    );

    renderPieChart(
      filteredProjects
    );

  }
);