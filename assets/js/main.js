(function () {
  var rootPath = document.body.dataset.siteRoot || ".";
  var dataUrl = rootPath + "/data/articles.json";
  var selectedTag = "all";
  var articlesCache = [];

  initTheme();
  initReadingTime();
  initTableOfContents();
  loadArticles();

  function initTheme() {
    var button = document.querySelector("[data-theme-toggle]");
    var storedTheme = "";

    try {
      storedTheme = localStorage.getItem("thought-journal-theme") || "";
    } catch (error) {
      storedTheme = "";
    }

    var theme = storedTheme || "light";
    applyTheme(theme);

    if (!button) {
      return;
    }

    button.addEventListener("click", function () {
      var nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(nextTheme);

      try {
        localStorage.setItem("thought-journal-theme", nextTheme);
      } catch (error) {
        // 保存できない環境では、そのページ内だけで切り替えます。
      }
    });
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;

    var button = document.querySelector("[data-theme-toggle]");
    if (!button) {
      return;
    }

    var isDark = theme === "dark";
    button.textContent = isDark ? "Light" : "Dark";
    button.setAttribute("aria-label", isDark ? "ライトモードに切り替える" : "ダークモードに切り替える");
    button.setAttribute("aria-pressed", String(isDark));
  }

  function initReadingTime() {
    var targets = document.querySelectorAll("[data-reading-time]");
    if (!targets.length) {
      return;
    }

    var article = document.querySelector(".article-page");
    if (!article) {
      return;
    }

    var text = article.innerText.replace(/\s+/g, "");
    var minutes = Math.max(1, Math.ceil(text.length / 600));

    targets.forEach(function (target) {
      target.textContent = "読了目安 " + minutes + "分";
    });
  }

  function initTableOfContents() {
    var toc = document.querySelector("[data-toc]");
    var article = document.querySelector(".article-page");

    if (!toc || !article) {
      return;
    }

    var headings = article.querySelectorAll("h2");
    if (!headings.length) {
      toc.hidden = true;
      return;
    }

    var list = document.createElement("ol");
    list.className = "toc-list";

    headings.forEach(function (heading, index) {
      if (!heading.id) {
        heading.id = "section-" + (index + 1);
      }

      var item = document.createElement("li");
      var link = document.createElement("a");
      link.href = "#" + heading.id;
      link.textContent = heading.textContent;
      item.appendChild(link);
      list.appendChild(item);
    });

    toc.innerHTML = "";
    toc.appendChild(list);
  }

  function loadArticles() {
    var hasArticleTarget = document.querySelector("[data-latest-articles], [data-article-archive], [data-planned-articles], [data-tag-filters]");

    if (!hasArticleTarget) {
      return;
    }

    fetch(dataUrl)
      .then(function (response) {
        if (!response.ok) {
          throw new Error("記事データを読み込めませんでした。");
        }
        return response.json();
      })
      .then(function (articles) {
        articlesCache = articles;
        renderAllArticleSections();
      })
      .catch(function () {
        showLoadError();
      });
  }

  function showLoadError() {
    var selectors = ["[data-latest-articles]", "[data-article-archive]", "[data-planned-articles]"];
    selectors.forEach(function (selector) {
      var list = document.querySelector(selector);
      if (!list) {
        return;
      }
      list.innerHTML = "";
      var item = document.createElement("li");
      item.className = "empty-note";
      item.textContent = "記事の読み込みに失敗しました。ページを再読み込みしてください。";
      list.appendChild(item);
    });
  }

  function renderAllArticleSections() {
    renderTagFilters();
    renderArticleList("[data-latest-articles]", getPublishedArticles().slice(0, getLatestLimit()), true);
    renderArticleList("[data-article-archive]", filterByTag(getPublishedArticles()), true);
    renderArticleList("[data-planned-articles]", filterByTag(getPlannedArticles()), false);
  }

  function getPublishedArticles() {
    return articlesCache
      .filter(function (article) {
        return article.status === "published";
      })
      .sort(function (a, b) {
        return (b.date || "").localeCompare(a.date || "");
      });
  }

  function getPlannedArticles() {
    return articlesCache.filter(function (article) {
      return article.status === "planned";
    });
  }

  function getLatestLimit() {
    var latestList = document.querySelector("[data-latest-articles]");
    if (!latestList) {
      return 3;
    }

    return Number(latestList.dataset.latestLimit || 3);
  }

  function filterByTag(articles) {
    if (selectedTag === "all") {
      return articles;
    }

    return articles.filter(function (article) {
      return article.tags && article.tags.indexOf(selectedTag) !== -1;
    });
  }

  function renderTagFilters() {
    var container = document.querySelector("[data-tag-filters]");
    if (!container) {
      return;
    }

    var tags = [];
    articlesCache.forEach(function (article) {
      (article.tags || []).forEach(function (tag) {
        if (tags.indexOf(tag) === -1) {
          tags.push(tag);
        }
      });
    });

    container.innerHTML = "";
    container.appendChild(createTagButton("all", "すべて"));

    tags.forEach(function (tag) {
      container.appendChild(createTagButton(tag, tag));
    });
  }

  function createTagButton(tag, label) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "tag-filter";
    button.textContent = label;
    button.dataset.tag = tag;
    button.setAttribute("aria-pressed", String(selectedTag === tag));

    button.addEventListener("click", function () {
      selectedTag = tag;
      renderAllArticleSections();
    });

    return button;
  }

  function renderArticleList(selector, articles, useLink) {
    var list = document.querySelector(selector);
    if (!list) {
      return;
    }

    list.innerHTML = "";

    if (!articles.length) {
      var emptyItem = document.createElement("li");
      emptyItem.className = "empty-note";
      emptyItem.textContent = "このタグの記事はまだありません。";
      list.appendChild(emptyItem);
      return;
    }

    articles.forEach(function (article) {
      list.appendChild(createArticleCard(article, useLink));
    });
  }

  function createArticleCard(article, useLink) {
    var item = document.createElement("li");
    item.className = "article-card";

    var meta = document.createElement("p");
    meta.className = "article-meta";
    meta.textContent = article.displayDate + " / " + article.category;
    item.appendChild(meta);

    var title = document.createElement("h3");
    title.className = "article-card-title";

    if (useLink && article.url) {
      var link = document.createElement("a");
      link.href = rootPath + "/" + article.url;
      link.textContent = article.title;
      title.appendChild(link);
    } else {
      title.textContent = article.title;
    }

    item.appendChild(title);

    var summary = document.createElement("p");
    summary.textContent = article.summary;
    item.appendChild(summary);

    if (article.tags && article.tags.length) {
      var tagList = document.createElement("div");
      tagList.className = "article-tags";
      tagList.setAttribute("aria-label", "タグ");

      article.tags.forEach(function (tag) {
        var tagItem = document.createElement("span");
        tagItem.textContent = tag;
        tagList.appendChild(tagItem);
      });

      item.appendChild(tagList);
    }

    return item;
  }
})();
