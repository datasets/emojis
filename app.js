/* ============================================================
EMOJI ENCYCLOPEDIA
app.js

Main application controller.

Expected files:

/
├── index.html
├── styles.css
├── app.js
│
└── data/
└── emojis.csv

Expected CSV format:

Group,Subgroup,CodePoint,Status,Representation,Name,Section

Example:

Activities,event,1F383,fully-qualified,🎃,jack-o-lantern,E0.6
============================================================ */

"use strict";

/* ============================================================
CONFIGURATION
============================================================ */

const CONFIG = {

/* ----------------------------------------------------------
Data source
---------------------------------------------------------- */

DATA_URL: "./data/emojis.csv",

/* ----------------------------------------------------------
Rendering
---------------------------------------------------------- */

INITIAL_RENDER_COUNT: 120,

LOAD_MORE_COUNT: 120,

/* ----------------------------------------------------------
Storage
---------------------------------------------------------- */

FAVORITES_STORAGE_KEY:
"emoji-encyclopedia-favorites",

/* ----------------------------------------------------------
URL parameters
---------------------------------------------------------- */

URL_SEARCH_PARAM: "q",

URL_GROUP_PARAM: "group",

URL_SUBGROUP_PARAM: "subgroup",

/* ----------------------------------------------------------
Behavior
---------------------------------------------------------- */

DEFAULT_SHOW_STATUS:

[
  "fully-qualified"
],

SHOW_UNQUALIFIED_VARIANTS: false,

/* ----------------------------------------------------------
Search
---------------------------------------------------------- */

SEARCH_MIN_LENGTH: 0,

/* ----------------------------------------------------------
Toast
---------------------------------------------------------- */

TOAST_DURATION: 2200

};

/* ============================================================
APPLICATION STATE
============================================================ */

const STATE = {

/* ----------------------------------------------------------
Data
---------------------------------------------------------- */

emojis: [],

filteredEmojis: [],

/* ----------------------------------------------------------
Filters
---------------------------------------------------------- */

searchQuery: "",

selectedGroup: "all",

selectedSubgroup: "all",

/* ----------------------------------------------------------
Sorting
---------------------------------------------------------- */

sortMode: "relevance",

/* ----------------------------------------------------------
Pagination
---------------------------------------------------------- */

visibleCount:
CONFIG.INITIAL_RENDER_COUNT,

/* ----------------------------------------------------------
Favorites
---------------------------------------------------------- */

favorites: new Set(),

/* ----------------------------------------------------------
Modal
---------------------------------------------------------- */

activeEmoji: null,

/* ----------------------------------------------------------
Application
---------------------------------------------------------- */

isLoading: true,

hasError: false

};

/* ============================================================
DOM REFERENCES
============================================================ */

const DOM = {

/* ----------------------------------------------------------
Search
---------------------------------------------------------- */

searchInput:
document.getElementById("searchInput"),

clearSearch:
document.getElementById("clearSearch"),

/* ----------------------------------------------------------
Filters
---------------------------------------------------------- */

groupFilters:
document.getElementById("groupFilters"),

subgroupFilters:
document.getElementById("subgroupFilters"),

/* ----------------------------------------------------------
Results
---------------------------------------------------------- */

emojiGrid:
document.getElementById("emojiGrid"),

resultCount:
document.getElementById("resultCount"),

resultLabel:
document.getElementById("resultLabel"),

sortSelect:
document.getElementById("sortSelect"),

loadMore:
document.getElementById("loadMore"),

/* ----------------------------------------------------------
States
---------------------------------------------------------- */

loadingState:
document.getElementById("loadingState"),

emptyState:
document.getElementById("emptyState"),

errorState:
document.getElementById("errorState"),

/* ----------------------------------------------------------
Stats
---------------------------------------------------------- */

statsTotal:
document.getElementById("statsTotal"),

statsGroups:
document.getElementById("statsGroups"),

statsFavorites:
document.getElementById("statsFavorites"),

/* ----------------------------------------------------------
Actions
---------------------------------------------------------- */

randomEmoji:
document.getElementById("randomEmoji"),

favoritesButton:
document.getElementById("favoritesButton"),

/* ----------------------------------------------------------
Modal
---------------------------------------------------------- */

emojiModal:
document.getElementById("emojiModal"),

emojiModalContent:
document.getElementById("emojiModalContent"),

modalClose:
document.getElementById("modalClose")

};

/* ============================================================
APPLICATION INITIALIZATION
============================================================ */

async function init() {

try {

console.log(
  "[Emoji Encyclopedia] Starting application..."
);


/* Load saved favorites */

loadFavorites();


/* Read URL state */

loadURLState();


/* Attach events before loading */

setupEventListeners();


/* Load emoji database */

await loadEmojiDatabase();


/* Process and prepare data */

prepareEmojiData();


/* Build filters */

renderGroupFilters();

renderSubgroupFilters();


/* Apply initial filters */

applyFilters();


/* Update stats */

updateStats();


/* Render results */

renderResults();


/* Hide loading */

hideLoadingState();


console.log(
  `[Emoji Encyclopedia] Loaded ${STATE.emojis.length} emoji records.`
);

}

catch (error) {

console.error(
  "[Emoji Encyclopedia] Initialization failed:",
  error
);


showErrorState(
  "Unable to load the emoji database. Please make sure data/emojis.csv exists."
);

}

}

/* ============================================================
LOAD EMOJI DATABASE
============================================================ */

async function loadEmojiDatabase() {

STATE.isLoading = true;

const response =
await fetch(
CONFIG.DATA_URL,
{
cache: "no-store"
}
);

if (!response.ok) {

throw new Error(
  `Failed to load emoji CSV (${response.status})`
);

}

const csvText =
await response.text();

if (!csvText.trim()) {

throw new Error(
  "Emoji CSV file is empty."
);

}

const rawRows =
parseCSV(csvText);

if (!rawRows.length) {

throw new Error(
  "No emoji records found in CSV."
);

}

STATE.emojis =
rawRows
.map(normalizeEmoji)
.filter(Boolean);

}

/* ============================================================
CSV PARSER
============================================================ */

/*
Custom CSV parser.

Supports:

* Commas
* Quoted fields
* Escaped quotes
* Windows line endings
* Unix line endings

Avoids external dependencies.
*/

function parseCSV(text) {

const rows = [];

let row = [];

let field = "";

let insideQuotes = false;

for (
let i = 0;
i < text.length;
i++
) {

const character =
  text[i];


const nextCharacter =
  text[i + 1];


/* --------------------------------------------------------
   Quote
   -------------------------------------------------------- */

if (character === "\"") {


  if (
    insideQuotes &&
    nextCharacter === "\""
  ) {


    field += "\"";

    i++;

  }

  else {


    insideQuotes =
      !insideQuotes;

  }


  continue;


}


/* --------------------------------------------------------
   Comma
   -------------------------------------------------------- */

if (
  character === "," &&
  !insideQuotes
) {


  row.push(field);

  field = "";

  continue;


}


/* --------------------------------------------------------
   New line
   -------------------------------------------------------- */

if (
  (
    character === "\n" ||
    character === "\r"
  ) &&
  !insideQuotes
) {


  if (
    character === "\r" &&
    nextCharacter === "\n"
  ) {


    i++;


  }


  row.push(field);


  if (
    row.some(
      value =>
        value.trim() !== ""
    )
  ) {


    rows.push(row);


  }


  row = [];

  field = "";

  continue;


}


/* --------------------------------------------------------
   Normal character
   -------------------------------------------------------- */

field += character;

}

/* Final field */

row.push(field);

if (
row.some(
value =>
value.trim() !== ""
)
) {

rows.push(row);

}

if (
rows.length < 2
) {

return [];

}

/* ----------------------------------------------------------
Headers
---------------------------------------------------------- */

const headers =
rows[0].map(
header =>

    normalizeHeader(header)
);

/* ----------------------------------------------------------
Convert rows into objects
---------------------------------------------------------- */

const objects = [];

for (
let i = 1;
i < rows.length;
i++
) {

const values =
  rows[i];


const object = {};


headers.forEach(
  (
    header,
    index
  ) => {


    object[header] =
      (
        values[index] ||
        ""
      ).trim();


  }
);


objects.push(object);

}

return objects;

}

/* ============================================================
HEADER NORMALIZATION
============================================================ */

function normalizeHeader(header) {

return String(header)

.trim()

.toLowerCase()

.replace(
  /[\s\-_]+/g,
  "_"
)

}

/* ============================================================
NORMALIZE EMOJI RECORD
============================================================ */

function normalizeEmoji(raw) {

if (!raw) {

return null;

}

/* ----------------------------------------------------------
Extract CSV fields
---------------------------------------------------------- */

const group =

raw.group ||

raw.category ||

raw.categories ||

"Other";

const subgroup =

raw.subgroup ||

raw.sub_category ||

raw.subcategory ||

"Other";

const codepoint =

raw.codepoint ||

raw.code_point ||

raw.codepoints ||

raw.unicode ||

"";

const status =

raw.status ||

"unknown";

const representation =

raw.representation ||

raw.emoji ||

raw.character ||

raw.symbol ||

"";

const name =

raw.name ||

raw.description ||

raw.short_name ||

"Unnamed Emoji";

const section =

raw.section ||

raw.version ||

raw.unicode_version ||

"";

/* ----------------------------------------------------------
Validate
---------------------------------------------------------- */

if (
!representation &&
!codepoint
) {

return null;

}

/* ----------------------------------------------------------
Generate emoji from codepoint if missing
---------------------------------------------------------- */

let emoji =
representation;

if (!emoji) {

emoji =
  codepointToEmoji(codepoint);

}

if (!emoji) {

return null;

}

/* ----------------------------------------------------------
Normalize codepoint
---------------------------------------------------------- */

const normalizedCodepoint =
normalizeCodepoint(
codepoint ||
emojiToCodepoints(emoji)
);

/* ----------------------------------------------------------
Generate ID
---------------------------------------------------------- */

const id =

normalizedCodepoint ||

`emoji-${name}-${emoji}`;

/* ----------------------------------------------------------
Search index
---------------------------------------------------------- */

const searchText =

[
  name,

  emoji,

  group,

  subgroup,

  normalizedCodepoint,

  normalizedCodepoint.replace(
    /\s+/g,
    ""
  ),

  section,

  status

]

  .filter(Boolean)

  .join(" ")

  .toLowerCase();

/* ----------------------------------------------------------
Return normalized object
---------------------------------------------------------- */

return {

id,

emoji,

name,

group,

subgroup,

codepoint:
  normalizedCodepoint,

status,

section,


searchText,

favorite: false

};

}

/* ============================================================
PREPARE EMOJI DATA
============================================================ */

function prepareEmojiData() {

/* ----------------------------------------------------------
Filter unwanted qualification variants
---------------------------------------------------------- */

let emojis =
STATE.emojis;

if (
!CONFIG.SHOW_UNQUALIFIED_VARIANTS
) {

const fullyQualified =
  emojis.filter(
    emoji =>

      emoji.status ===
      "fully-qualified"
  );


/*
   Some datasets may have entries without a
   qualification status.

   Only use fully-qualified filtering if such
   entries actually exist.
*/

if (
  fullyQualified.length > 0
) {


  emojis =
    fullyQualified;


}

}

/* ----------------------------------------------------------
Deduplicate
---------------------------------------------------------- */

const unique = new Map();

for (
const emoji of emojis
) {

const duplicateKey =

  `${emoji.emoji}|${emoji.codepoint}`;


if (
  !unique.has(duplicateKey)
) {


  unique.set(
    duplicateKey,
    emoji
  );


}

}

STATE.emojis =
Array.from(
unique.values()
);

/* ----------------------------------------------------------
Alphabetical base ordering
---------------------------------------------------------- */

STATE.emojis.sort(
(
a,
b
) =>

  a.name.localeCompare(
    b.name
  )

);

/* ----------------------------------------------------------
Apply favorite state
---------------------------------------------------------- */

STATE.emojis.forEach(
emoji => {

  emoji.favorite =
    STATE.favorites.has(
      emoji.id
    );


}

);

}

/* ============================================================
CODEPOINT HELPERS
============================================================ */

function normalizeCodepoint(value) {

if (!value) {

return "";

}

return String(value)

.trim()

.replace(
  /U\+/gi,
  ""
)

.replace(
  /0x/gi,
  ""
)

.replace(
  /,/g,
  " "
)

.replace(
  /-/g,
  " "
)

.replace(
  /\s+/g,
  " "
)

.toUpperCase();

}

function codepointToEmoji(codepointString) {

if (!codepointString) {

return "";

}

try {

const points =

  normalizeCodepoint(codepointString)

    .split(" ")

    .filter(Boolean)

    .map(
      point =>

        parseInt(
          point,
          16
        )
    )

    .filter(
      point =>

        !Number.isNaN(point)
    );


if (!points.length) {


  return "";


}


return String.fromCodePoint(
  ...points
);

}

catch {

return "";

}

}

function emojiToCodepoints(emoji) {

if (!emoji) {

return "";

}

return Array
.from(emoji)

.map(
  character =>

    character
      .codePointAt(0)
      .toString(16)
      .toUpperCase()
)

.join(" ");

}

/* ============================================================
EVENT LISTENERS
============================================================ */

function setupEventListeners() {

/* ----------------------------------------------------------
Search
---------------------------------------------------------- */

DOM.searchInput?.addEventListener(
"input",
handleSearchInput
);

/* ----------------------------------------------------------
Clear search
---------------------------------------------------------- */

DOM.clearSearch?.addEventListener(
"click",
clearSearch
);

/* ----------------------------------------------------------
Sort
---------------------------------------------------------- */

DOM.sortSelect?.addEventListener(
"change",
event => {

  STATE.sortMode =
    event.target.value;


  STATE.visibleCount =
    CONFIG.INITIAL_RENDER_COUNT;


  applyFilters();

  renderResults();


}

);

/* ----------------------------------------------------------
Load more
---------------------------------------------------------- */

DOM.loadMore?.addEventListener(
"click",
() => {

  STATE.visibleCount +=
    CONFIG.LOAD_MORE_COUNT;


  renderResults();


}

);

/* ----------------------------------------------------------
Random emoji
---------------------------------------------------------- */

DOM.randomEmoji?.addEventListener(
"click",
openRandomEmoji
);

/* ----------------------------------------------------------
Favorites button
---------------------------------------------------------- */

DOM.favoritesButton?.addEventListener(
"click",
showFavorites
);

/* ----------------------------------------------------------
Modal close
---------------------------------------------------------- */

DOM.modalClose?.addEventListener(
"click",
closeEmojiModal
);

/* ----------------------------------------------------------
Modal backdrop
---------------------------------------------------------- */

DOM.emojiModal?.addEventListener(
"click",
event => {

  if (
    event.target === DOM.emojiModal ||
    event.target.classList.contains(
      "emoji-modal-backdrop"
    )
  ) {


    closeEmojiModal();


  }


}

);

/* ----------------------------------------------------------
Keyboard shortcuts
---------------------------------------------------------- */

document.addEventListener(
"keydown",
handleKeyboardShortcuts
);

/* ----------------------------------------------------------
Browser navigation
---------------------------------------------------------- */

window.addEventListener(
"popstate",
() => {

  loadURLState();

  applyFilters();

  renderGroupFilters();

  renderSubgroupFilters();

  renderResults();


}

);

}

/* ============================================================
SEARCH INPUT
============================================================ */

function handleSearchInput(event) {

STATE.searchQuery =
event.target.value.trim();

STATE.visibleCount =
CONFIG.INITIAL_RENDER_COUNT;

/* Clear button */

if (DOM.clearSearch) {

DOM.clearSearch.hidden =
  !STATE.searchQuery;

}

/* Search changes reset category selection only
if user wants global searching */

applyFilters();

renderResults();

updateURL();

}

/* ============================================================
CLEAR SEARCH
============================================================ */

function clearSearch() {

STATE.searchQuery = "";

if (DOM.searchInput) {

DOM.searchInput.value = "";


DOM.searchInput.focus();

}

if (DOM.clearSearch) {

DOM.clearSearch.hidden = true;

}

STATE.visibleCount =
CONFIG.INITIAL_RENDER_COUNT;

applyFilters();

renderResults();

updateURL();

}

/* ============================================================
FILTERING
============================================================ */

function applyFilters() {

const query =
STATE.searchQuery
.toLowerCase()
.trim();

let results =
[...STATE.emojis];

/* ----------------------------------------------------------
Group filter
---------------------------------------------------------- */

if (
STATE.selectedGroup !== "all"
) {

results =
  results.filter(
    emoji =>

      emoji.group ===
      STATE.selectedGroup
  );

}

/* ----------------------------------------------------------
Subgroup filter
---------------------------------------------------------- */

if (
STATE.selectedSubgroup !== "all"
) {

results =
  results.filter(
    emoji =>

      emoji.subgroup ===
      STATE.selectedSubgroup
  );

}

/* ----------------------------------------------------------
Search filter
---------------------------------------------------------- */

if (
query.length >=
CONFIG.SEARCH_MIN_LENGTH
) {

if (query) {


  const normalizedQuery =
    normalizeSearchQuery(query);


  results =
    results.filter(
      emoji =>

        emojiMatchesSearch(
          emoji,
          normalizedQuery
        )
    );


}

}

/* ----------------------------------------------------------
Sorting
---------------------------------------------------------- */

results =
sortEmojis(
results,
STATE.sortMode,
query
);

STATE.filteredEmojis =
results;

}

/* ============================================================
NORMALIZE SEARCH QUERY
============================================================ */

function normalizeSearchQuery(query) {

return query

.toLowerCase()

.replace(
  /u\+/g,
  ""
)

.replace(
  /0x/g,
  ""
)

.trim();

}

/* ============================================================
SEARCH MATCHING
============================================================ */

function emojiMatchesSearch(
emoji,
query
) {

if (!query) {

return true;

}

/* Direct emoji search */

if (
emoji.emoji.includes(query)
) {

return true;

}

/* Normal full-text search */

if (
emoji.searchText.includes(query)
) {

return true;

}

/* Codepoint without spaces */

const compactCodepoint =
emoji.codepoint
.replace(
/\s+/g,
""
)
.toLowerCase();

const compactQuery =
query
.replace(
/\s+/g,
""
);

if (
compactCodepoint.includes(
compactQuery
)
) {

return true;

}

/* Word matching */

const words =
query
.split(/\s+/)
.filter(Boolean);

if (
words.length > 1
) {

return words.every(
  word =>

    emoji.searchText.includes(
      word
    )
);

}

return false;

}

/* ============================================================
SORTING
============================================================ */

function sortEmojis(
emojis,
sortMode,
searchQuery
) {

const sorted =
[...emojis];

switch (sortMode) {

/* --------------------------------------------------------
   Name ascending
   -------------------------------------------------------- */

case "name-asc":

  sorted.sort(
    (
      a,
      b
    ) =>

      a.name.localeCompare(
        b.name
      )
  );

  break;


/* --------------------------------------------------------
   Name descending
   -------------------------------------------------------- */

case "name-desc":

  sorted.sort(
    (
      a,
      b
    ) =>

      b.name.localeCompare(
        a.name
      )
  );

  break;


/* --------------------------------------------------------
   Unicode
   -------------------------------------------------------- */

case "unicode":

  sorted.sort(
    (
      a,
      b
    ) =>

      compareCodepoints(
        a.codepoint,
        b.codepoint
      )
  );

  break;


/* --------------------------------------------------------
   Favorites
   -------------------------------------------------------- */

case "favorites":

  sorted.sort(
    (
      a,
      b
    ) => {


      if (
        a.favorite &&
        !b.favorite
      ) return -1;


      if (
        !a.favorite &&
        b.favorite
      ) return 1;


      return a.name.localeCompare(
        b.name
      );


    }
  );

  break;


/* --------------------------------------------------------
   Search relevance
   -------------------------------------------------------- */

case "relevance":

default:


  if (searchQuery) {


    sorted.sort(
      (
        a,
        b
      ) =>

        getSearchScore(
          b,
          searchQuery
        )

        -

        getSearchScore(
          a,
          searchQuery
        )
    );


  }


  break;

}

return sorted;

}

/* ============================================================
SEARCH RELEVANCE
============================================================ */

function getSearchScore(
emoji,
query
) {

const normalizedQuery =
query.toLowerCase();

const name =
emoji.name.toLowerCase();

let score = 0;

/* Exact name */

if (
name === normalizedQuery
) {

score += 1000;

}

/* Starts with */

if (
name.startsWith(
normalizedQuery
)
) {

score += 500;

}

/* Name contains */

if (
name.includes(
normalizedQuery
)
) {

score += 250;

}

/* Group */

if (
emoji.group
.toLowerCase()
.includes(
normalizedQuery
)
) {

score += 80;

}

/* Subgroup */

if (
emoji.subgroup
.toLowerCase()
.includes(
normalizedQuery
)
) {

score += 60;

}

/* Codepoint */

if (
emoji.codepoint
.toLowerCase()
.includes(
normalizedQuery
)
) {

score += 150;

}

/* Favorite boost */

if (
emoji.favorite
) {

score += 5;

}

return score;

}

/* ============================================================
CODEPOINT SORTING
============================================================ */

function compareCodepoints(
a,
b
) {

const firstA =
parseInt(
a.split(" ")[0],
16
);

const firstB =
parseInt(
b.split(" ")[0],
16
);

return firstA - firstB;

}

/* ============================================================
GROUP FILTERS
============================================================ */

function renderGroupFilters() {

if (!DOM.groupFilters) return;

const groups =
getGroups();

const fragment =
document.createDocumentFragment();

/* ----------------------------------------------------------
All
---------------------------------------------------------- */

fragment.appendChild(

createFilterButton(
  {
    label: "All Emojis",

    value: "all",

    count:
      STATE.emojis.length,

    active:
      STATE.selectedGroup ===
      "all",

    onClick:
      () => {


        STATE.selectedGroup =
          "all";


        STATE.selectedSubgroup =
          "all";


        STATE.visibleCount =
          CONFIG.INITIAL_RENDER_COUNT;


        applyFilters();

        renderGroupFilters();

        renderSubgroupFilters();

        renderResults();

        updateURL();


      }
  }
)

);

/* ----------------------------------------------------------
Groups
---------------------------------------------------------- */

groups.forEach(
group => {

  const count =
    STATE.emojis.filter(
      emoji =>

        emoji.group === group
    ).length;


  fragment.appendChild(

    createFilterButton(
      {
        label:
          formatGroupName(group),

        value:
          group,

        count,

        active:
          STATE.selectedGroup ===
          group,

        onClick:
          () => {


            STATE.selectedGroup =
              group;


            STATE.selectedSubgroup =
              "all";


            STATE.visibleCount =
              CONFIG.INITIAL_RENDER_COUNT;


            applyFilters();

            renderGroupFilters();

            renderSubgroupFilters();

            renderResults();

            updateURL();


          }
      }
    )

  );


}

);

DOM.groupFilters.replaceChildren(
fragment
);

}

/* ============================================================
SUBGROUP FILTERS
============================================================ */

function renderSubgroupFilters() {

if (!DOM.subgroupFilters) return;

const subgroups =
getSubgroups();

const fragment =
document.createDocumentFragment();

/* ----------------------------------------------------------
All subgroups
---------------------------------------------------------- */

fragment.appendChild(

createFilterButton(
  {
    label: "All Subcategories",

    value: "all",

    count:

      STATE.selectedGroup === "all"

        ? STATE.emojis.length

        : STATE.emojis.filter(
            emoji =>

              emoji.group ===
              STATE.selectedGroup
          ).length,

    active:

      STATE.selectedSubgroup ===
      "all",

    onClick:
      () => {


        STATE.selectedSubgroup =
          "all";


        STATE.visibleCount =
          CONFIG.INITIAL_RENDER_COUNT;


        applyFilters();

        renderSubgroupFilters();

        renderResults();

        updateURL();


      }
  }
)

);

/* ----------------------------------------------------------
Subgroups
---------------------------------------------------------- */

subgroups.forEach(
subgroup => {

  const count =
    STATE.emojis.filter(
      emoji => {


        if (
          STATE.selectedGroup !== "all" &&
          emoji.group !== STATE.selectedGroup
        ) {


          return false;


        }


        return (
          emoji.subgroup === subgroup
        );


      }
    ).length;


  fragment.appendChild(

    createFilterButton(
      {
        label:
          formatGroupName(subgroup),

        value:
          subgroup,

        count,

        active:

          STATE.selectedSubgroup ===
          subgroup,

        onClick:
          () => {


            STATE.selectedSubgroup =
              subgroup;


            STATE.visibleCount =
              CONFIG.INITIAL_RENDER_COUNT;


            applyFilters();

            renderSubgroupFilters();

            renderResults();

            updateURL();


          }
      }
    )

  );


}

);

DOM.subgroupFilters.replaceChildren(
fragment
);

}

/* ============================================================
CREATE FILTER BUTTON
============================================================ */

function createFilterButton(
options
) {

const button =
document.createElement("button");

button.type =
"button";

button.className =
"filter-button";

if (options.active) {

button.classList.add(
  "active"
);

}

const label =
document.createElement("span");

label.textContent =
options.label;

const count =
document.createElement("span");

count.className =
"filter-count";

count.textContent =
formatNumber(
options.count
);

button.append(
label,
count
);

button.addEventListener(
"click",
options.onClick
);

return button;

}

/* ============================================================
GET GROUPS
============================================================ */

function getGroups() {

return [

...new Set(

  STATE.emojis.map(
    emoji =>
      emoji.group
  )

)

]

.filter(Boolean)

.sort(
  (
    a,
    b
  ) =>

    a.localeCompare(b)
);

}

/* ============================================================
GET SUBGROUPS
============================================================ */

function getSubgroups() {

return [

...new Set(

  STATE.emojis

    .filter(
      emoji => {


        if (
          STATE.selectedGroup ===
          "all"
        ) {


          return true;


        }


        return (
          emoji.group ===
          STATE.selectedGroup
        );


      }
    )

    .map(
      emoji =>
        emoji.subgroup
    )

)

]

.filter(Boolean)

.sort(
  (
    a,
    b
  ) =>

    a.localeCompare(b)
);

}

/* ============================================================
FORMAT GROUP NAME
============================================================ */

function formatGroupName(value) {

if (!value) {

return "Other";

}

return String(value)

.replace(
  /[-_]/g,
  " "
)

.replace(
  /\b\w/g,
  character =>
    character.toUpperCase()
);

}

/* ============================================================
RENDER RESULTS
============================================================ */

function renderResults() {

if (!DOM.emojiGrid) return;

const total =
STATE.filteredEmojis.length;

const visible =
STATE.filteredEmojis.slice(
0,
STATE.visibleCount
);

/* ----------------------------------------------------------
Empty state
---------------------------------------------------------- */

if (
total === 0
) {

DOM.emojiGrid.replaceChildren();


showEmptyState();


updateResultCount(
  0
);


hideLoadMore();


return;

}

hideEmptyState();

/* ----------------------------------------------------------
Render cards
---------------------------------------------------------- */

const fragment =
document.createDocumentFragment();

visible.forEach(
emoji => {

  fragment.appendChild(

    createEmojiCard(
      emoji
    )

  );


}

);

DOM.emojiGrid.replaceChildren(
fragment
);

/* ----------------------------------------------------------
Count
---------------------------------------------------------- */

updateResultCount(
total
);

/* ----------------------------------------------------------
Load more
---------------------------------------------------------- */

if (
visible.length < total
) {

showLoadMore(
  total -
  visible.length
);

}

else {

hideLoadMore();

}

}

/* ============================================================
CREATE EMOJI CARD
============================================================ */

function createEmojiCard(
emoji
) {

const card =
document.createElement("article");

card.className =
"emoji-card";

card.tabIndex = 0;

card.setAttribute(
"role",
"button"
);

card.setAttribute(
"aria-label",
`View details for ${emoji.name}`
);

/* ----------------------------------------------------------
Emoji symbol
---------------------------------------------------------- */

const symbol =
document.createElement("div");

symbol.className =
"emoji-symbol";

symbol.textContent =
emoji.emoji;

/* ----------------------------------------------------------
Info
---------------------------------------------------------- */

const info =
document.createElement("div");

info.className =
"emoji-info";

const name =
document.createElement("h3");

name.className =
"emoji-name";

name.textContent =
emoji.name;

const codepoint =
document.createElement("div");

codepoint.className =
"emoji-codepoint";

codepoint.textContent =
`U+${emoji.codepoint}`;

info.append(
name,
codepoint
);

/* ----------------------------------------------------------
Favorite
---------------------------------------------------------- */

const favorite =
document.createElement("button");

favorite.type =
"button";

favorite.className =
"emoji-favorite";

favorite.setAttribute(
"aria-label",

emoji.favorite

  ? `Remove ${emoji.name} from favorites`

  : `Add ${emoji.name} to favorites`

);

favorite.textContent =

emoji.favorite

  ? "★"

  : "☆";

favorite.addEventListener(
"click",
event => {

  event.stopPropagation();


  toggleFavorite(
    emoji
  );


  favorite.textContent =

    emoji.favorite

      ? "★"

      : "☆";


  favorite.setAttribute(
    "aria-label",

    emoji.favorite

      ? `Remove ${emoji.name} from favorites`

      : `Add ${emoji.name} to favorites`
  );


}

);

/* ----------------------------------------------------------
Card click
---------------------------------------------------------- */

card.addEventListener(
"click",
() => {

  openEmojiModal(
    emoji
  );

}

);

/* ----------------------------------------------------------
Keyboard
---------------------------------------------------------- */

card.addEventListener(
"keydown",
event => {

  if (
    event.key === "Enter" ||
    event.key === " "
  ) {


    event.preventDefault();


    openEmojiModal(
      emoji
    );


  }


}

);

card.append(
symbol,
info,
favorite
);

return card;

}

/* ============================================================
RESULT COUNT
============================================================ */

function updateResultCount(
count
) {

if (DOM.resultCount) {

DOM.resultCount.textContent =
  formatNumber(count);

}

if (DOM.resultLabel) {

DOM.resultLabel.textContent =

  count === 1

    ? "emoji"

    : "emojis";

}

}

/* ============================================================
LOAD MORE
============================================================ */

function showLoadMore(
remaining
) {

if (!DOM.loadMore) return;

DOM.loadMore.hidden =
false;

const nextAmount =
Math.min(
CONFIG.LOAD_MORE_COUNT,
remaining
);

DOM.loadMore.textContent =
`Load ${formatNumber(nextAmount)} More Emojis`;

}

function hideLoadMore() {

if (!DOM.loadMore) return;

DOM.loadMore.hidden =
true;

}

/* ============================================================
FAVORITES
============================================================ */

function loadFavorites() {

try {

const stored =
  localStorage.getItem(
    CONFIG.FAVORITES_STORAGE_KEY
  );


if (!stored) return;


const favorites =
  JSON.parse(stored);


if (
  Array.isArray(favorites)
) {


  STATE.favorites =
    new Set(favorites);


}

}

catch (error) {

console.warn(
  "[Emoji Encyclopedia] Unable to load favorites:",
  error
);


STATE.favorites =
  new Set();

}

}

function saveFavorites() {

try {

localStorage.setItem(

  CONFIG.FAVORITES_STORAGE_KEY,

  JSON.stringify(

    Array.from(
      STATE.favorites
    )

  )

);

}

catch (error) {

console.warn(
  "[Emoji Encyclopedia] Unable to save favorites:",
  error
);

}

}

function toggleFavorite(
emoji
) {

if (!emoji) return;

if (
STATE.favorites.has(
emoji.id
)
) {

STATE.favorites.delete(
  emoji.id
);


emoji.favorite = false;


showToast(
  `${emoji.emoji} Removed from favorites`
);

}

else {

STATE.favorites.add(
  emoji.id
);


emoji.favorite = true;


showToast(
  `${emoji.emoji} Added to favorites`
);

}

saveFavorites();

updateStats();

}

/* ============================================================
SHOW FAVORITES
============================================================ */

function showFavorites() {

const favoriteCount =
STATE.favorites.size;

if (
favoriteCount === 0
) {

showToast(
  "You haven't added any favorites yet."
);


return;

}

/* Reset category filters */

STATE.selectedGroup =
"all";

STATE.selectedSubgroup =
"all";

/* Clear search */

STATE.searchQuery = "";

if (DOM.searchInput) {

DOM.searchInput.value = "";

}

if (DOM.clearSearch) {

DOM.clearSearch.hidden = true;

}

/* Filter favorites */

STATE.filteredEmojis =
STATE.emojis.filter(
emoji =>

    emoji.favorite
);

STATE.sortMode =
"favorites";

if (DOM.sortSelect) {

DOM.sortSelect.value =
  "favorites";

}

STATE.visibleCount =
CONFIG.INITIAL_RENDER_COUNT;

renderGroupFilters();

renderSubgroupFilters();

renderResults();

showToast(
`${favoriteCount} favorite${favoriteCount === 1 ? "" : "s"}`
);

}

/* ============================================================
RANDOM EMOJI
============================================================ */

function openRandomEmoji() {

if (
!STATE.emojis.length
) return;

const randomIndex =
Math.floor(

  Math.random() *
  STATE.emojis.length

);

const emoji =
STATE.emojis[
randomIndex
];

openEmojiModal(
emoji
);

}

/* ============================================================
EMOJI MODAL
============================================================ */

function openEmojiModal(
emoji
) {

if (
!emoji ||
!DOM.emojiModal ||
!DOM.emojiModalContent
) {

return;

}

STATE.activeEmoji =
emoji;

/* Clear existing */

DOM.emojiModalContent.replaceChildren();

/* ----------------------------------------------------------
Header
---------------------------------------------------------- */

const header =
document.createElement("div");

header.className =
"emoji-modal-header";

const symbol =
document.createElement("div");

symbol.className =
"emoji-modal-symbol";

symbol.textContent =
emoji.emoji;

const titleContainer =
document.createElement("div");

const title =
document.createElement("h2");

title.id =
"emojiModalTitle";

title.textContent =
emoji.name;

const category =
document.createElement("p");

category.className =
"emoji-modal-category";

category.textContent =
`${formatGroupName(emoji.group)} · ${formatGroupName(emoji.subgroup)}`;

titleContainer.append(
title,
category
);

header.append(
symbol,
titleContainer
);

/* ----------------------------------------------------------
Metadata
---------------------------------------------------------- */

const metadata =
document.createElement("div");

metadata.className =
"emoji-metadata";

metadata.append(

createMetadataRow(
  "Emoji",
  emoji.emoji
),

createMetadataRow(
  "Name",
  emoji.name
),

createMetadataRow(
  "Unicode Codepoint",
  `U+${emoji.codepoint}`
),

createMetadataRow(
  "Group",
  formatGroupName(
    emoji.group
  )
),

createMetadataRow(
  "Subgroup",
  formatGroupName(
    emoji.subgroup
  )
),

createMetadataRow(
  "Qualification",
  emoji.status
),

createMetadataRow(
  "Emoji Version",
  emoji.section || "Unknown"
)

);

/* ----------------------------------------------------------
Actions
---------------------------------------------------------- */

const actions =
document.createElement("div");

actions.className =
"emoji-modal-actions";

/* Copy emoji */

const copyEmojiButton =
createActionButton(
"Copy Emoji",
async () => {

    const copied =
      await copyToClipboard(
        emoji.emoji
      );


    if (copied) {


      showToast(
        `${emoji.emoji} Copied to clipboard`
      );


    }


  }
);

/* Copy Unicode */

const copyUnicodeButton =
createActionButton(
"Copy Unicode",
async () => {

    const copied =
      await copyToClipboard(
        `U+${emoji.codepoint}`
      );


    if (copied) {


      showToast(
        "Unicode codepoint copied"
      );


    }


  }
);

/* Favorite */

const favoriteButton =
createActionButton(
emoji.favorite

    ? "Remove Favorite"

    : "Add Favorite",

  () => {


    toggleFavorite(
      emoji
    );


    favoriteButton.textContent =

      emoji.favorite

        ? "Remove Favorite"

        : "Add Favorite";


  }
);

/* Search similar */

const similarButton =
createActionButton(
"View Category",
() => {

    closeEmojiModal();


    STATE.selectedGroup =
      emoji.group;


    STATE.selectedSubgroup =
      "all";


    STATE.searchQuery =
      "";


    if (DOM.searchInput) {


      DOM.searchInput.value =
        "";


    }


    applyFilters();

    renderGroupFilters();

    renderSubgroupFilters();

    renderResults();

    updateURL();


  }
);

actions.append(

copyEmojiButton,

copyUnicodeButton,

favoriteButton,

similarButton

);

DOM.emojiModalContent.append(

header,

metadata,

actions

);

/* ----------------------------------------------------------
Open modal
---------------------------------------------------------- */

DOM.emojiModal.hidden =
false;

document.body.classList.add(
"modal-open"
);

/* Focus close button */

setTimeout(
() => {

  DOM.modalClose?.focus();


},
50

);

}

function closeEmojiModal() {

if (
!DOM.emojiModal
) return;

DOM.emojiModal.hidden =
true;

document.body.classList.remove(
"modal-open"
);

STATE.activeEmoji =
null;

}

/* ============================================================
METADATA ROW
============================================================ */

function createMetadataRow(
label,
value
) {

const row =
document.createElement("div");

row.className =
"emoji-metadata-row";

const labelElement =
document.createElement("div");

labelElement.className =
"emoji-metadata-label";

labelElement.textContent =
label;

const valueElement =
document.createElement("div");

valueElement.className =
"emoji-metadata-value";

valueElement.textContent =
value;

row.append(
labelElement,
valueElement
);

return row;

}

/* ============================================================
ACTION BUTTON
============================================================ */

function createActionButton(
label,
handler
) {

const button =
document.createElement("button");

button.type =
"button";

button.className =
"emoji-action-button";

button.textContent =
label;

button.addEventListener(
"click",
handler
);

return button;

}

/* ============================================================
CLIPBOARD
============================================================ */

async function copyToClipboard(
text
) {

try {

if (
  navigator.clipboard &&
  window.isSecureContext
) {


  await navigator.clipboard.writeText(
    text
  );


  return true;


}


/* Fallback */

const textarea =
  document.createElement(
    "textarea"
  );


textarea.value =
  text;


textarea.style.position =
  "fixed";


textarea.style.opacity =
  "0";


document.body.appendChild(
  textarea
);


textarea.select();


document.execCommand(
  "copy"
);


textarea.remove();


return true;

}

catch (error) {

console.warn(
  "Clipboard copy failed:",
  error
);


showToast(
  "Unable to copy to clipboard"
);


return false;

}

}

/* ============================================================
KEYBOARD SHORTCUTS
============================================================ */

function handleKeyboardShortcuts(
event
) {

/* ----------------------------------------------------------
Escape
---------------------------------------------------------- */

if (
event.key === "Escape"
) {

if (
  STATE.activeEmoji
) {


  closeEmojiModal();


}


return;

}

/* ----------------------------------------------------------
Search with /
---------------------------------------------------------- */

if (
event.key === "/" &&
!isTypingInInput()
) {

event.preventDefault();


DOM.searchInput?.focus();


return;

}

/* ----------------------------------------------------------
Random emoji
Ctrl + Enter
---------------------------------------------------------- */

if (
event.ctrlKey &&
event.key === "Enter"
) {

event.preventDefault();


openRandomEmoji();

}

}

/* ============================================================
INPUT DETECTION
============================================================ */

function isTypingInInput() {

const active =
document.activeElement;

if (!active) return false;

const tag =
active.tagName.toLowerCase();

return (

tag === "input" ||

tag === "textarea" ||

tag === "select" ||

active.isContentEditable

);

}

/* ============================================================
STATS
============================================================ */

function updateStats() {

/* ----------------------------------------------------------
Total emojis
---------------------------------------------------------- */

if (DOM.statsTotal) {

DOM.statsTotal.textContent =
  formatNumber(
    STATE.emojis.length
  );

}

/* ----------------------------------------------------------
Groups
---------------------------------------------------------- */

if (DOM.statsGroups) {

DOM.statsGroups.textContent =
  formatNumber(
    getGroups().length
  );

}

/* ----------------------------------------------------------
Favorites
---------------------------------------------------------- */

if (DOM.statsFavorites) {

DOM.statsFavorites.textContent =
  formatNumber(
    STATE.favorites.size
  );

}

}

/* ============================================================
LOADING STATE
============================================================ */

function hideLoadingState() {

STATE.isLoading =
false;

if (DOM.loadingState) {

DOM.loadingState.hidden =
  true;

}

}

/* ============================================================
EMPTY STATE
============================================================ */

function showEmptyState() {

if (DOM.emptyState) {

DOM.emptyState.hidden =
  false;

}

}

function hideEmptyState() {

if (DOM.emptyState) {

DOM.emptyState.hidden =
  true;

}

}

/* ============================================================
ERROR STATE
============================================================ */

function showErrorState(
message
) {

STATE.hasError =
true;

STATE.isLoading =
false;

if (DOM.loadingState) {

DOM.loadingState.hidden =
  true;

}

if (DOM.errorState) {

DOM.errorState.hidden =
  false;


DOM.errorState.textContent =
  message;

}

}

/* ============================================================
URL STATE
============================================================ */

function loadURLState() {

const params =
new URLSearchParams(
window.location.search
);

const query =
params.get(
CONFIG.URL_SEARCH_PARAM
);

const group =
params.get(
CONFIG.URL_GROUP_PARAM
);

const subgroup =
params.get(
CONFIG.URL_SUBGROUP_PARAM
);

if (query) {

STATE.searchQuery =
  query;


if (DOM.searchInput) {


  DOM.searchInput.value =
    query;


}


if (DOM.clearSearch) {


  DOM.clearSearch.hidden =
    false;


}

}

if (group) {

STATE.selectedGroup =
  group;

}

if (subgroup) {

STATE.selectedSubgroup =
  subgroup;

}

}

function updateURL() {

try {

const url =
  new URL(
    window.location.href
  );


/* Search */

if (
  STATE.searchQuery
) {


  url.searchParams.set(

    CONFIG.URL_SEARCH_PARAM,

    STATE.searchQuery

  );


}

else {


  url.searchParams.delete(
    CONFIG.URL_SEARCH_PARAM
  );


}


/* Group */

if (
  STATE.selectedGroup !== "all"
) {


  url.searchParams.set(

    CONFIG.URL_GROUP_PARAM,

    STATE.selectedGroup

  );


}

else {


  url.searchParams.delete(
    CONFIG.URL_GROUP_PARAM
  );


}


/* Subgroup */

if (
  STATE.selectedSubgroup !== "all"
) {


  url.searchParams.set(

    CONFIG.URL_SUBGROUP_PARAM,

    STATE.selectedSubgroup

  );


}

else {


  url.searchParams.delete(
    CONFIG.URL_SUBGROUP_PARAM
  );


}


window.history.replaceState(

  {},

  "",

  url

);

}

catch (error) {

console.warn(
  "Unable to update URL:",
  error
);

}

}

/* ============================================================
TOAST NOTIFICATIONS
============================================================ */

let toastTimer = null;

function showToast(
message
) {

let toast =
document.querySelector(
".app-toast"
);

if (!toast) {

toast =
  document.createElement(
    "div"
  );


toast.className =
  "app-toast";


document.body.appendChild(
  toast
);

}

toast.textContent =
message;

toast.classList.add(
"visible"
);

clearTimeout(
toastTimer
);

toastTimer =
setTimeout(
() => {

    toast.classList.remove(
      "visible"
    );


  },

  CONFIG.TOAST_DURATION
);

}

/* ============================================================
NUMBER FORMATTING
============================================================ */

function formatNumber(
number
) {

return new Intl.NumberFormat(
"en-US"
).format(
number || 0
);

}

/* ============================================================
APPLICATION START
============================================================ */

document.addEventListener(
"DOMContentLoaded",
init
);
