// Code for hub db modeule under the modules we have file hub this is the script from there 


const hubGrid = document.querySelector(".HubGrid__inner-container"),
  hubFeed = document.querySelector(".HubFeed"),
  sortingSelect = document.querySelector("select.HubFilters__sorting-select"),
  filterGroups = document.querySelectorAll(".HubFiltersMenu"),
  filterItems = document.querySelectorAll(".HubFiltersMenu__item input"),
  resetButton = document.querySelector(".HubFilters__reset"),
  hubSearch = document.querySelector("#hubSearch"),
  paginationSummary = document.querySelector(".HubPaginationSummary"),
  filterMenu = document.querySelector(".HubFilters"),
  filterToggle = document.querySelector(".HubFilters__title"),
  { tableID: tableID, portalID: portalID } = JSON.parse(
    document.getElementById("hub-data").text
  ),
  initialPageTitle = document.title || "Content Hub",
  staggerOffset = 100,
  limit = 12,
  baseUrl = `https://api.hubapi.com/cms/v3/hubdb/tables/${tableID}/rows?portalId=${portalID}&limit=12`;
let params,
  sorting,
  after = 0,
  windowWidth = window.innerWidth;
const debounce = (e, t) => {
    let r;
    return (...a) => {
      clearTimeout(r), (r = setTimeout(() => e.apply(this, a), t));
    };
  },
  scrollToTopOfElementWithOffset = (e, t = 2e3) => {
    const r = e.getBoundingClientRect().top + window.scrollY - t;
    window.scrollTo({ top: r, behavior: "smooth" });
  },
  showError = (e) => {
    hubGrid.innerHTML = `<p class="Fetch-error">${e}</p>`;
  },
  expandFilterMenuOnDesktop = () => {
    windowWidth > 992 && filterMenu.classList.add("HubFilters--open");
  },
  showRelatedFilters = async () => {
    const e = {},
      t = hubSearch.value.trim();
    filterGroups.forEach((t) => {
      const r = t.dataset.filter,
        a = Array.from(
          t.querySelectorAll('input[type="checkbox"]:checked')
        ).map((e) => encodeURIComponent(e.value));
      a.length > 0 && (e[r] = a);
    });
    const r = await fetchFiltersData(e, t);
    if (!r || !r.results || 0 === r.results.length) return;
    const a = {};
    r.results.forEach((e) => {
      Object.entries(e.values).forEach(([e, t]) => {
        Array.isArray(t) &&
          t.length &&
          (a[e] || (a[e] = new Set()),
          t.forEach((t) => a[e].add(t.name.toLowerCase())));
      });
    }),
      Array.from(filterItems).forEach((e) =>
        e.parentElement.classList.add("HubFiltersMenu__item--hidden")
      ),
      filterGroups.forEach((e) => {
        const t = e.dataset.filter;
        e.querySelectorAll('input[type="checkbox"]').forEach((e) => {
          const r = e.value.toLowerCase();
          a[t]?.has(r) &&
            e.parentElement.classList.remove("HubFiltersMenu__item--hidden");
        });
      }),
      filterGroups.forEach((e) => {
        e.querySelectorAll(
          ".HubFiltersMenu__item:not(.HubFiltersMenu__item--hidden)"
        ).length
          ? e.classList.remove("HubFiltersMenu--hidden")
          : e.classList.add("HubFiltersMenu--hidden");
      });
  },
  showAllFilters = () => {
    Array.from(filterItems).forEach((e) =>
      e.classList.remove("HubFiltersMenu__item--hidden")
    ),
      filterGroups.forEach((e) => e.classList.remove("HubFiltersMenu--hidden"));
  },
  buildFilterQuery = () => {
    let e = "";
    return (
      filterGroups.forEach((t) => {
        let r = [];
        if (
          (t.querySelectorAll('input[type="checkbox"]:checked').forEach((e) => {
            r.push(encodeURIComponent(e.value));
          }),
          r.length > 0)
        ) {
          const a = t.dataset.filter;
          e += `&${a}__in=${r.join(",")}`;
        }
      }),
      e
    );
  },
  buildFilterString = () => {
    let e = "",
      t = "",
      r = "";
    return (
      filterGroups.forEach((e) => {
        e.querySelectorAll('input[type="checkbox"]:checked').forEach((a) => {
          e === filterGroups[0]
            ? (t += 0 === t.length ? `${a.value}` : `, ${a.value}`)
            : (r += 0 === r.length ? `${a.value}` : `, ${a.value}`);
        });
      }),
      (e = `${r}${r.length && t.length ? " in " : ""}${t}`),
      e
    );
  },
  parseURLParams = () => {
    const e = new URLSearchParams(window.location.search);
    filterItems.forEach((e) => (e.checked = !1)),
      filterGroups.forEach((t) => {
        const r = t.dataset.filter,
          a = e.get(`${r}__in`);
        a &&
          (a.split(",").forEach((e) => {
            const r = t.querySelector(
              `input[value="${decodeURIComponent(e)}"]`
            );
            r && (r.checked = !0);
          }),
          a.split(",").length > 0 &&
            (t.classList.add("HubFiltersMenu--active"),
            filterMenu.classList.add("HubFilters--open")));
      });
    const t = e.get("headline__icontains");
    (hubSearch.value = t || ""),
      (sorting = e.get("sort") || "-popularity"),
      (sortingSelect.value = sorting),
      (after = parseInt(e.get("offset"), 10) || 0);
  },
  updateURL = (e) => {
    const t = `${window.location.pathname}?${e}&sort=${sorting}&offset=${after}`;
    history.pushState({ path: t }, "", t);
  },
  updatePageTitle = (e, t) => {
    let r = "";
    e && t
      ? (r = ` ("${e}" from ${t})`)
      : e
      ? (r = ` ("${e}")`)
      : t && (r = ` (${t})`);
    const a = initialPageTitle + r;
    document.title = a;
  },
  createCardHTML = (e, t) => {
    const r =
        e && e.summary
          ? e.summary.length > 128
            ? `${e.summary.substring(0, 128)}...`
            : e.summary
          : "",
      a = document.createElement("article");
    a.classList.add("Card"),
      (a.style.opacity = 0),
      setTimeout(() => {
        a.style.opacity = 1;
      }, 100 * (t + 1));
    const i = [
      ...(Array.isArray(e.content_type) ? e.content_type : []),
      ...(Array.isArray(e.service_type) ? e.service_type : []),
    ]
      .map((e) =>
        e && e.name ? `<div class="Card__tag Tag">${e.name}</div>` : ""
      )
      .join("");
    return (
      (a.innerHTML = `\n    <div class="Card__top">\n\n      <figure class="Card__image">\n        ${
        e.image && e.image.url
          ? `<img src="${e.image.url}" alt="${e.headline}" loading="lazy" />`
          : '<div class="Card__image-fallback"></div>'
      }\n      </figure>\n\n      ${
        i && `<div class="Card__tag-row">${i}</div>`
      }\n      ${
        e.published_date
          ? `<time class="Card__date">${new Intl.DateTimeFormat("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }).format(new Date(e.published_date))}</time>`
          : ""
      }\n     \n      <div class="Card__text flow">\n        ${
        e.headline ? `<h3 class="Card__title">${e.headline}</h3>` : ""
      }\n        ${
        r ? `<p class="Card__summary">${r}</p>` : ""
      }\n      </div>\n    </div>\n    <div class="Card__button">\n      <a href="${
        e.link ? e.link : "/#"
      }">Continue reading</a>\n    </div>\n  `),
      a
    );
  },
  createPaginationButton = (e, t, r, a, i) => {
    const n = document.createElement("button");
    n.classList.add(`HubPagination__button--${t}`),
      (n.textContent = r),
      (n.disabled = a),
      n.addEventListener("click", i),
      r === Math.floor(after / 12) + 1 && n.classList.add("active"),
      e.appendChild(n);
  },
  renderPagination = (e) => {
    const t = e.total,
      r = Math.ceil(t / 12),
      a = Math.floor(after / 12) + 1,
      i = document.querySelector(".HubPagination");
    if (((i.innerHTML = ""), t > 0)) {
      const e = 3;
      let n = Math.max(1, a - Math.floor(e / 2)),
        o = n + e - 1;
      o > r && ((o = r), (n = Math.max(1, o - e + 1))),
        createPaginationButton(i, "first", "First", 1 === a, () => {
          (after = 0),
            fetchData(after, sorting, buildFilterQuery(), hubSearch.value),
            scrollToTopOfElementWithOffset(hubGrid);
        }),
        createPaginationButton(i, "prev", "", 1 === a, () => {
          after >= 12 &&
            ((after -= 12),
            fetchData(after, sorting, buildFilterQuery(), hubSearch.value),
            scrollToTopOfElementWithOffset(hubGrid));
        });
      for (let e = n; e <= o; e++)
        createPaginationButton(i, "page-num", e, e === a, () => {
          (after = 12 * (e - 1)),
            fetchData(after, sorting, buildFilterQuery(), hubSearch.value),
            scrollToTopOfElementWithOffset(hubGrid);
        });
      createPaginationButton(i, "next", "", a === r, () => {
        after + 12 < t &&
          ((after += 12),
          fetchData(after, sorting, buildFilterQuery(), hubSearch.value),
          scrollToTopOfElementWithOffset(hubGrid));
      }),
        createPaginationButton(i, "last", "Last", a === r, () => {
          (after = 12 * (r - 1)),
            fetchData(after, sorting, buildFilterQuery(), hubSearch.value),
            scrollToTopOfElementWithOffset(hubGrid);
        });
    }
  },
  updateHubGridWithData = (e) => {
    if (((hubGrid.innerHTML = ""), 0 === e.results.length))
      paginationSummary.textContent = "";
    else {
      e.results.forEach((e, t) => {
        const r = createCardHTML(e.values, t);
        hubGrid.appendChild(r);
      });
      const t = after + 1,
        r = Math.min(after + 12, e.total);
      paginationSummary.textContent = `Showing ${t}-${r} of ${e.total}`;
    }
  },
  fetchData = async (e, t, r, a = "", i = 0) => {
    (t = t || "-popularity"), (r = r || buildFilterQuery());
    const n = a.trim() ? `&headline__icontains=${encodeURIComponent(a)}` : "",
      o = `${r}${n}&sort=${t}&offset=${e}`;
    try {
      const n = await fetch(baseUrl + o);
      if (!n.ok) {
        if (429 === n.status && i < 3) {
          const n = 1e3 * Math.pow(2, i);
          return (
            console.log(`Rate limit hit, retrying in ${n} ms...`),
            void setTimeout(() => fetchData(e, t, r, a, i + 1), n)
          );
        }
        throw new Error(`HTTP error! Status: ${n.status}`);
      }
      const l = await n.json();
      if (0 === l.results.length)
        return (
          renderPagination(l),
          updateHubGridWithData(l),
          showError("No results for those filters at the moment"),
          updateURL(o),
          void updatePageTitle(a.trim(), buildFilterString())
        );
      updateHubGridWithData(l), renderPagination(l);
    } catch (e) {
      console.error("Fetching Error:", e.message),
        showError(
          "Sorry, there was an error fetching the content. Please refresh or try again later."
        );
    }
    updateURL(o), updatePageTitle(a.trim(), buildFilterString());
  },
  fetchFiltersData = async (e, t, r = 0) => {
    const a = `https://api.hubapi.com/cms/v3/hubdb/tables/${tableID}/rows?portalId=${portalID}`;
    let i = "";
    Object.entries(e).forEach(([e, t]) => {
      i += `&${e}__in=${t.join(",")}`;
    });
    const n = t ? `&headline__icontains=${encodeURIComponent(t)}` : "";
    i += n;
    try {
      const n = await fetch(a + i);
      if (!n.ok) {
        if (429 === n.status && r < 3) {
          const a = 1e3 * Math.pow(2, r);
          return (
            console.log(`Rate limit hit, retrying in ${a} ms...`),
            void setTimeout(() => fetchFiltersData(e, t, r + 1), a)
          );
        }
        throw new Error(`HTTP error! Status: ${n.status}`);
      }
      return await n.json();
    } catch (e) {
      console.error("Fetching Error:", e.message), showAllFilters();
    }
  };
window.addEventListener("resize", () => {
  (windowWidth = window.innerWidth), expandFilterMenuOnDesktop();
}),
  filterGroups?.forEach((e) => {
    e.querySelector(".HubFiltersMenu__title").addEventListener("click", (t) => {
      e.classList.toggle("HubFiltersMenu--active");
    });
  }),
  filterToggle.addEventListener("click", () => {
    filterMenu.classList.toggle("HubFilters--open");
  }),
  filterItems.forEach((e) => {
    e.addEventListener("change", (e) => {
      (after = 0),
        showRelatedFilters(),
        fetchData(after, sorting, buildFilterQuery(), hubSearch.value);
    });
  }),
  sortingSelect.addEventListener("change", (e) => {
    (after = 0),
      (sorting = e.target.value),
      fetchData(after, sorting, params, hubSearch.value);
  }),
  hubSearch.addEventListener(
    "input",
    debounce((e) => {
      const t = e.target.value;
      (after = 0),
        fetchData(after, sorting, buildFilterQuery(), t),
        showRelatedFilters();
    }, 500)
  ),
  resetButton.addEventListener("click", () => {
    filterItems.forEach((e) => (e.checked = !1)),
      (hubSearch.value = ""),
      (sortingSelect.value = "-popularity"),
      (params = ""),
      (sorting = "-popularity"),
      (after = 0),
      showRelatedFilters(),
      filterGroups.forEach((e, t) => {
        0 !== t && e.classList.remove("HubFiltersMenu--active");
      }),
      fetchData(0, "-popularity", "");
  }),
  window.addEventListener("popstate", function () {
    parseURLParams(),
      fetchData(after, sorting, params, hubSearch.value),
      showRelatedFilters();
  }),
  document.addEventListener("DOMContentLoaded", () => {
    expandFilterMenuOnDesktop(),
      parseURLParams(),
      fetchData(after, sorting, buildFilterQuery(), hubSearch.value),
      showRelatedFilters();
  });
