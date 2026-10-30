console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// let currentLink = navLinks.find(
//   (a) => a.host === location.host && a.pathname === location.pathname,
// );
// currentLink?.classList.add('current');

// Catelog Setting
let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Project' },
  { url: 'CV/', title: 'CV' },
  { url: 'contact/', title: 'Contact' },
  { url: 'https://github.com/Weiym-dot', title: 'Profile' }
];

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;

  const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"                  // Local server
  : "/DSC-106-Lab-3/";         // GitHub Pages repo name

  // if (!url.startsWith('http')) { url = BASE_PATH + url; }
  url = !url.startsWith('http') ? BASE_PATH + url : url;
  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;
  nav.append(a);
  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add('current');
  }
  if (a.host !== location.host) {
    a.target = "_blank";
  }

}

// Dark/Light Mode Setting
document.body.insertAdjacentHTML(
  'afterbegin',
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

let select = document.querySelector('.color-scheme select');

// Reusable function
function setColorScheme(colorScheme) {
  document.documentElement.style.setProperty(
    "color-scheme",
    colorScheme
  );
}

// Load saved preference
if ("colorScheme" in localStorage) {
  setColorScheme(localStorage.colorScheme);
  select.value = localStorage.colorScheme;
}

// Listen for changes
select.addEventListener("input", function (event) {
  setColorScheme(event.target.value);

  localStorage.colorScheme = event.target.value;
});

// Contact Setting
let form = document.querySelector('form');

form?.addEventListener('submit', function (event) {

  // Stop the browser's normal form submission
  event.preventDefault();

  // Read all submitted form fields
  let data = new FormData(form);

  // Start building the mailto URL
  let url = form.action + '?';

  // Build URL parameters
  for (let [name, value] of data) {
    url += `${name}=${encodeURIComponent(value)}&`;
  }

  // Remove the final &
  url = url.slice(0, -1);

  console.log(url);

  // Open email client
  location.href = url;
});

// read json file
export async function fetchJSON(url) {
  try {
    // Fetch the JSON file
    const response = await fetch(url);

    // Check whether the request was successful
    if (!response.ok) {
      throw new Error(
        `Failed to fetch projects: ${response.statusText}`
      );
    }

    // Convert the response into JavaScript data
    const data = await response.json();

    return data;

  } catch (error) {
    console.error(
      'Error fetching or parsing JSON data:',
      error
    );
  }
}

export function renderProjects(
  projects,
  containerElement,
  headingLevel = 'h2'
) {
  containerElement.innerHTML = '';

  for (let project of projects) {
    const article =
      document.createElement('article');

    article.innerHTML = `
      <${headingLevel}>${project.title}</${headingLevel}>
      <img
        src="${project.image}"
        alt="${project.title}"
      >
      <p>${project.description}</p>
    `;

    containerElement.appendChild(article);
  }
}

export async function fetchGithubData(username) {
  return fetchJSON(
    `https://api.github.com/users/${username}`
  );
}