import { fetchJSON, renderProjects } from '../global.js';

// read json file and store its data
const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
renderProjects(
  projects,
  projectsContainer,
  'h2'
);

const projectsTitle =
  document.querySelector('.projects-title');

projectsTitle.textContent =
  `${projects.length} Projects`;