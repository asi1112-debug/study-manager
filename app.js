const STORAGE_KEY = "study-manager-data-v2";
const LEGACY_STORAGE_KEY = "study-manager";

function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getLocalDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatTime(seconds) {
  seconds = Math.max(0, Math.floor(seconds || 0));

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return [
    String(h).padStart(2, "0"),
    String(m).padStart(2, "0"),
    String(s).padStart(2, "0")
  ].join(":");
}

function loadData() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);

    const parsed = JSON.parse(current || legacy || "{}");

    return {
      ...parsed,
      books: Array.isArray(parsed.books) ? parsed.books : [],
      plans: Array.isArray(parsed.plans) ? parsed.plans : [],
      records: Array.isArray(parsed.records) ? parsed.records : [],
      activeTimer: parsed.activeTimer || null
    };
  } catch (error) {
    console.error("データ読み込みエラー:", error);

    return {
      books: [],
      plans: [],
      records: [],
      activeTimer: null
    };
  }
}

const data = loadData();

function save() {
  try {
    const json = JSON.stringify(data);

    localStorage.setItem(STORAGE_KEY, json);
    localStorage.setItem(LEGACY_STORAGE_KEY, json);
  } catch (error) {
    console.error("データ保存エラー:", error);
  }
}


/* =========================
   ページ切り替え
========================= */

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    const pageName = button.dataset.page;

    document.querySelectorAll(".page").forEach(page => {
      page.classList.remove("active");
    });

    const target = document.getElementById(pageName);

    if (target) {
      target.classList.add("active");
    }

    document.querySelectorAll("[data-page]").forEach(item => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    renderAll();
  });
});


/* =========================
   本の登録
========================= */

const addBookButton = document.getElementById("addBook");

if (addBookButton) {
  addBookButton.addEventListener("click", () => {
    const nameElement = document.getElementById("bookName");
    const subjectElement = document.getElementById("bookSubject");
    const countElement = document.getElementById("problemCount");

    const name = nameElement ? nameElement.value.trim() : "";
    const subject = subjectElement ? subjectElement.value : "その他";
    const problemCount = countElement
      ? Number(countElement.value)
      : 0;

    if (!name) {
      alert("参考書名を入力してください。");
      return;
    }

    if (!Number.isInteger(problemCount) || problemCount < 1) {
      alert("大問数を1以上で入力してください。");
      return;
    }

    const problems = [];

    for (let i = 1; i <= problemCount; i++) {
      problems.push({
        id: createId(),
        number: i,
        completed: false
      });
    }

    data.books.push({
      id: createId(),
      name,
      subject,
      problems,
      createdAt: Date.now()
    });

    save();

    if (nameElement) nameElement.value = "";
    if (countElement) countElement.value = "";

    renderAll();
  });
}


/* =========================
   本の削除・問題完了
========================= */

function deleteBook(bookId) {
  const book = data.books.find(item => item.id === bookId);

  if (!book) return;

  if (!confirm(`「${book.name}」を削除しますか？`)) {
    return;
  }

  data.books = data.books.filter(item => item.id !== bookId);

  data.plans.forEach(plan => {
    if (plan.bookId === bookId) {
      plan.bookId = "";
    }
  });

  save();
  renderAll();
}

function toggleProblem(bookId, problemId) {
  const book = data.books.find(item => item.id === bookId);

  if (!book) return;

  const problem = book.problems.find(item => item.id === problemId);

  if (!problem) return;

  problem.completed = !problem.completed;

  save();
  renderAll();
}


/* =========================
   参考書一覧表示
========================= */

function renderBooks() {
  const container = document.getElementById("bookList");

  if (!container) return;

  if (data.books.length === 0) {
    container.innerHTML = "<p>まだ参考書が登録されていません。</p>";
    return;
  }

  container.innerHTML = data.books.map(book => {
    const total = book.problems.length;
    const completed = book.problems.filter(
      problem => problem.completed
    ).length;

    const percent = total > 0
      ? Math.round((completed / total) * 100)
      : 0;

    const problemsHTML = book.problems.map(problem => `
      <label class="problem-item">
        <input
          type="checkbox"
          ${problem.completed ? "checked" : ""}
          onchange="toggleProblem('${book.id}', '${problem.id}')"
        >
        大問${problem.number}
      </label>
    `).join("");

    return `
      <div class="card">
        <h3>${escapeHTML(book.name)}</h3>

        <p>
          科目：${escapeHTML(book.subject)}
        </p>

        <p>
          進捗：${completed} / ${total} 大問
          （${percent}%）
        </p>

        <div class="progress">
          <div
            class="progress-bar"
            style="width:${percent}%"
          ></div>
        </div>

        <div class="problem-list">
          ${problemsHTML}
        </div>

        <button onclick="deleteBook('${book.id}')">
          参考書を削除
        </button>
      </div>
    `;
  }).join("");
}


/* =========================
   参考書選択肢
========================= */

function renderBookSelect() {
  const select = document.getElementById("planBook");

  if (!select) return;

  const currentValue = select.value;

  select.innerHTML = `
    <option value="">参考書を選択しない</option>
    ${data.books.map(book => `
      <option value="${book.id}">
        ${escapeHTML(book.name)}
      </option>
    `).join("")}
  `;

  if (
    data.books.some(book => book.id === currentValue)
  ) {
    select.value = currentValue;
  }
}


/* =========================
   学習計画
========================= */

const addPlanButton = document.getElementById("addPlan");

if (addPlanButton) {
  addPlanButton.addEventListener("click", () => {
    const dayElement = document.getElementById("planDay");
    const subjectElement = document.getElementById("planSubject");
    const bookElement = document.getElementById("planBook");
    const minutesElement = document.getElementById("planMinutes");
    const problemsElement = document.getElementById("planProblems");

    const day = dayElement ? dayElement.value : "月";
    const subject = subjectElement ? subjectElement.value : "その他";
    const bookId = bookElement ? bookElement.value : "";
    const minutes = minutesElement
      ? Number(minutesElement.value)
      : 0;
    const problems = problemsElement
      ? Number(problemsElement.value)
      : 0;

    if (!Number.isFinite(minutes) || minutes < 0) {
      alert("学習時間を正しく入力してください。");
      return;
    }

    if (!Number.isInteger(problems) || problems < 0) {
      alert("大問数を正しく入力してください。");
      return;
    }

    data.plans.push({
      id: createId(),
      day,
      subject,
      bookId,
      minutes,
      problems,
      createdAt: Date.now()
    });

    save();

    if (minutesElement) minutesElement.value = "";
    if (problemsElement) problemsElement.value = "";

    renderAll();
  });
}


function deletePlan(planId) {
  if (!confirm("この学習計画を削除しますか？")) {
    return;
  }

  data.plans = data.plans.filter(
    plan => plan.id !== planId
  );

  save();
  renderAll();
}


/* =========================
   曜日
========================= */

function getTodayJapaneseDay() {
  const days = [
    "日",
    "月",
    "火",
    "水",
    "木",
    "金",
    "土"
  ];

  return days[new Date().getDay()];
}


/* =========================
   曜日
========================= */

function getTodayJapaneseDay() {
  const days = [
    "日",
    "月",
    "火",
    "水",
    "木",
    "金",
    "土"
  ];

  return days[new Date().getDay()];
}

function normalizePlanDay(day) {
  const dayMap = {
    "0": "日",
    "1": "月",
    "2": "火",
    "3": "水",
    "4": "木",
    "5": "金",
    "6": "土",
    "日": "日",
    "月": "月",
    "火": "火",
    "水": "水",
    "木": "木",
    "金": "金",
    "土": "土"
  };

  return dayMap[String(day)] || String(day);
}


/* =========================
   今日の大問進捗
========================= */

function getDailyProblemProgress(plan) {
  if (!plan.bookId) {
    return {
      completed: 0,
      target: Number(plan.problems) || 0,
      remaining: []
    };
  }

  const book = data.books.find(
    item => item.id === plan.bookId
  );

  if (!book) {
    return {
      completed: 0,
      target: Number(plan.problems) || 0,
      remaining: []
    };
  }

  const target = Number(plan.problems) || 0;

  const completedProblems = book.problems.filter(
    problem => problem.completed
  );

  const completed = Math.min(
    completedProblems.length,
    target
  );

  const remaining = book.problems.filter(
    problem => !problem.completed
  );

  return {
    completed,
    target,
    remaining
  };
}


/* =========================
   今日の学習時間
========================= */

function getTodayTotalSeconds() {
  const today = getLocalDate();

  return data.records
    .filter(record => record.date === today)
    .reduce(
      (total, record) =>
        total + Number(record.duration || 0),
      0
    );
}

function getTodaySubjectSeconds(subject) {
  const today = getLocalDate();

  return data.records
    .filter(
      record =>
        record.date === today &&
        record.subject === subject
    )
    .reduce(
      (total, record) =>
        total + Number(record.duration || 0),
      0
    );
}


/* =========================
   今日のホーム
========================= */

function renderHome() {
  const container =
    document.getElementById("todayPlans");

  const totalElement =
    document.getElementById("todayTotal");

  const today =
    getTodayJapaneseDay();

  const todayPlans =
    data.plans.filter(
      plan =>
        normalizePlanDay(plan.day) === today
    );

  if (totalElement) {
    const totalMinutes =
      Math.floor(
        getTodayTotalSeconds() / 60
      );

    totalElement.textContent =
      `${totalMinutes}分`;
  }

  if (!container) return;

  if (todayPlans.length === 0) {
    container.innerHTML =
      "<p>今日の学習計画はありません。</p>";
    return;
  }

  container.innerHTML =
    todayPlans.map(plan => {

      const actualSeconds =
        getTodaySubjectSeconds(
          plan.subject
        );

      const actualMinutes =
        Math.floor(
          actualSeconds / 60
        );

      const targetMinutes =
        Number(plan.minutes) || 0;

      const percent =
        targetMinutes > 0
          ? Math.min(
              100,
              Math.round(
                (actualMinutes /
                  targetMinutes) * 100
              )
            )
          : 0;

      const progress =
        getDailyProblemProgress(plan);

      let problemsHTML = "";

      if (progress.target > 0) {
        const completed =
          progress.completed;

        const target =
          progress.target;

        const remaining =
          Math.max(
            0,
            target - completed
          );

        problemsHTML = `
          <p>
            📚 大問：
            ${completed} / ${target}
            完了
          </p>

          <p>
            残り：
            ${remaining} 大問
          </p>
        `;
      }

      return `
        <div class="card">

          <h3>
            ${escapeHTML(plan.subject)}
          </h3>

          <p>
            📅
            ${escapeHTML(
              normalizePlanDay(plan.day)
            )}曜日
          </p>

          <p>
            ⏱ 目標：
            ${targetMinutes}分
          </p>

          <p>
            ⏱ 実績：
            ${actualMinutes}分
          </p>

          <p>
            📊 達成率：
            ${percent}%
          </p>

          ${problemsHTML}

        </div>
      `;
    }).join("");
}


/* =========================
   学習計画一覧
========================= */

function renderPlans() {
  const container =
    document.getElementById("planList");

  if (!container) return;

  if (data.plans.length === 0) {
    container.innerHTML =
      "<p>まだ学習計画がありません。</p>";
    return;
  }

  const dayOrder = {
    "日": 0,
    "月": 1,
    "火": 2,
    "水": 3,
    "木": 4,
    "金": 5,
    "土": 6
  };

  const plans =
    [...data.plans].sort(
      (a, b) =>
        (
          dayOrder[
            normalizePlanDay(a.day)
          ] ?? 99
        ) -
        (
          dayOrder[
            normalizePlanDay(b.day)
          ] ?? 99
        )
    );

  container.innerHTML =
    plans.map(plan => {

      const book =
        data.books.find(
          item =>
            item.id === plan.bookId
        );

      const day =
        normalizePlanDay(plan.day);

      return `
        <div class="card">

          <h3>
            ${escapeHTML(day)}曜日
            ／
            ${escapeHTML(plan.subject)}
          </h3>

          ${
            book
              ? `
                <p>
                  📚
                  ${escapeHTML(book.name)}
                </p>
              `
              : ""
          }

          <p>
            ⏱
            ${Number(plan.minutes) || 0}分
          </p>

          <p>
            📚
            ${Number(plan.problems) || 0}大問
          </p>

          <button
            onclick="deletePlan('${plan.id}')"
          >
            計画を削除
          </button>

        </div>
      `;
    }).join("");
}


/* =========================
   タイマー
========================= */

const startTimerButton =
  document.getElementById("startTimer");

if (startTimerButton) {
  startTimerButton.addEventListener("click", () => {

    if (data.activeTimer) {
      alert("すでにタイマーが動いています。");
      return;
    }

    const subjectElement =
      document.getElementById("timerSubject");

    const subject =
      subjectElement
        ? subjectElement.value
        : "その他";

    data.activeTimer = {
      subject,
      start: Date.now()
    };

    save();

    const status =
      document.getElementById("timerStatus");

    if (status) {
      status.textContent = "タイマー作動中";
    }

    updateTimer();
  });
}


const stopTimerButton =
  document.getElementById("stopTimer");

if (stopTimerButton) {
  stopTimerButton.addEventListener("click", () => {

    if (!data.activeTimer) {
      alert("タイマーは動いていません。");
      return;
    }

    const end = Date.now();

    const duration =
      Math.max(
        0,
        Math.floor(
          (end - data.activeTimer.start) / 1000
        )
      );

    data.records.push({
      id: createId(),
      subject: data.activeTimer.subject,
      start: data.activeTimer.start,
      end,
      duration,
      date: getLocalDate(new Date(end))
    });

    data.activeTimer = null;

    save();

    const display =
      document.getElementById("timerDisplay");

    if (display) {
      display.textContent = "00:00:00";
    }

    const status =
      document.getElementById("timerStatus");

    if (status) {
      status.textContent =
        "学習時間を記録しました。";
    }

    renderAll();
  });
}


function updateTimer() {

  const display =
    document.getElementById("timerDisplay");

  if (!display) return;

  if (!data.activeTimer) {
    display.textContent = "00:00:00";
    return;
  }

  const elapsed =
    Math.floor(
      (Date.now() - data.activeTimer.start) / 1000
    );

  display.textContent =
    formatTime(elapsed);
}


/* =========================
   学習記録・統計
========================= */

function renderStats() {

  const container =
    document.getElementById("statsList");

  if (!container) return;

  if (data.records.length === 0) {

    container.innerHTML = `
      <div class="card">
        <p>学習記録がありません。</p>
      </div>
    `;

    return;
  }

  const today =
    getLocalDate();

  const todayRecords =
    data.records.filter(
      record => record.date === today
    );

  const todaySeconds =
    todayRecords.reduce(
      (total, record) =>
        total + Number(record.duration || 0),
      0
    );

  const totalSeconds =
    data.records.reduce(
      (total, record) =>
        total + Number(record.duration || 0),
      0
    );

  const subjectTotals = {};

  data.records.forEach(record => {

    const subject =
      record.subject || "その他";

    subjectTotals[subject] =
      (subjectTotals[subject] || 0) +
      Number(record.duration || 0);
  });

  const subjectHTML =
    Object.entries(subjectTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([subject, seconds]) => `
        <div class="card">

          <h3>
            ${escapeHTML(subject)}
          </h3>

          <p>
            ${formatTime(seconds)}
          </p>

        </div>
      `)
      .join("");

  const recordHTML =
    [...data.records]
      .sort(
        (a, b) =>
          Number(b.start || 0) -
          Number(a.start || 0)
      )
      .map(record => {

        const duration =
          Number(record.duration || 0);

        const date =
          record.date || "";

        return `
          <div class="card">

            <h3>
              ${escapeHTML(
                record.subject || "その他"
              )}
            </h3>

            <p>
              📅 ${escapeHTML(date)}
            </p>

            <p>
              ⏱ ${formatTime(duration)}
            </p>

          </div>
        `;
      })
      .join("");

  container.innerHTML = `

    <div class="card">

      <h3>今日の学習時間</h3>

      <p class="big-number">
        ${Math.floor(todaySeconds / 60)}分
      </p>

    </div>

    <div class="card">

      <h3>これまでの学習時間</h3>

      <p class="big-number">
        ${Math.floor(totalSeconds / 60)}分
      </p>

    </div>

    <h3>科目別</h3>

    ${subjectHTML}

    <h3>学習記録</h3>

    ${recordHTML}

  `;
}


/* =========================
   全画面更新
========================= */

function renderAll() {
  renderHome();
  renderBooks();
  renderBookSelect();
  renderPlans();
  renderStats();
  updateTimer();
}

renderAll();

setInterval(() => {
  updateTimer();
}, 1000);
// ================================
// 無料の参考書検索（Google Books）
// ================================

const aiBookSearchButton = document.getElementById("aiBookSearchButton");

if (aiBookSearchButton) {
  aiBookSearchButton.addEventListener("click", async () => {
    const input = document.getElementById("aiBookSearch");
    const result = document.getElementById("aiBookSearchResult");

    if (!input || !result) return;

    const keyword = input.value.trim();

    if (!keyword) {
      result.innerHTML = `
        <p class="muted">参考書名を入力してください。</p>
      `;
      return;
    }

    result.innerHTML = `
      <p class="muted">🔎 参考書を検索しています...</p>
    `;

    try {
      const url =
        "https://www.googleapis.com/books/v1/volumes?q=" +
        encodeURIComponent(keyword) +
        "&maxResults=10&langRestrict=ja";

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("検索に失敗しました");
      }

      const resultData = await response.json();

      if (!resultData.items || resultData.items.length === 0) {
        result.innerHTML = `
          <p class="muted">参考書が見つかりませんでした。</p>
        `;
        return;
      }

      result.innerHTML = resultData.items.map(item => {
        const info = item.volumeInfo || {};

        const title = info.title || "タイトル不明";
        const authors = info.authors
          ? info.authors.join("、")
          : "著者不明";
        const publisher = info.publisher || "出版社不明";

        const isbn =
          (info.industryIdentifiers || []).find(
            id => id.type === "ISBN_13"
          )?.identifier ||
          (info.industryIdentifiers || []).find(
            id => id.type === "ISBN_10"
          )?.identifier ||
          "";

        const thumbnail =
          info.imageLinks?.thumbnail || "";

        return `
          <div class="card">
            ${
              thumbnail
                ? `<img src="${thumbnail}" alt="" style="max-width:100px;">`
                : ""
            }

            <h3>${escapeHTML(title)}</h3>

            <p>著者：${escapeHTML(authors)}</p>
            <p>出版社：${escapeHTML(publisher)}</p>
            ${
              isbn
                ? `<p>ISBN：${escapeHTML(isbn)}</p>`
                : ""
            }

            <button
              class="useBookSearchResult"
              data-title="${escapeHTML(title)}"
              data-isbn="${escapeHTML(isbn)}"
            >
              この参考書を登録
            </button>
          </div>
        `;
      }).join("");

      document.querySelectorAll(".useBookSearchResult").forEach(button => {
        button.addEventListener("click", () => {
          const title = button.dataset.title || "";
          const bookName = document.getElementById("bookName");

          if (bookName) {
            bookName.value = title;
          }

          window.scrollTo({
            top: document.getElementById("bookName")?.offsetTop || 0,
            behavior: "smooth"
          });
        });
      });

    } catch (error) {
      console.error(error);

      result.innerHTML = `
        <p class="muted">
          検索中にエラーが発生しました。
        </p>
      `;
    }
  });
}
