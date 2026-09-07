const STORAGE_KEY = "studyManagerData";

let data = JSON.parse(
  localStorage.getItem(STORAGE_KEY)
) || {
  books: [],
  plans: [],
  records: [],
  activeTimer: null,
  dailyTargets: {}
};


/* =========================
   既存データの補正
========================= */

if (!Array.isArray(data.books)) {
  data.books = [];
}

if (!Array.isArray(data.plans)) {
  data.plans = [];
}

if (!Array.isArray(data.records)) {
  data.records = [];
}

if (!("activeTimer" in data)) {
  data.activeTimer = null;
}

if (!data.dailyTargets || typeof data.dailyTargets !== "object") {
  data.dailyTargets = {};
}

data.plans.forEach(plan => {
  if (!("bookId" in plan)) {
    plan.bookId = "";
  }

  if (!("minutes" in plan)) {
    plan.minutes = 0;
  }

  if (!("problems" in plan)) {
    plan.problems = 0;
  }
});


function save() {

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(data)
  );

}


function createId() {

  if (
    crypto &&
    crypto.randomUUID
  ) {
    return crypto.randomUUID();
  }

  return Date.now().toString();
}


/* =========================
   日本時間の日付
========================= */

function getLocalDate(date = new Date()) {

  const y =
    date.getFullYear();

  const m =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const d =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${y}-${m}-${d}`;

}


/* =========================
   曜日
========================= */

const dayNames = [
  "日曜日",
  "月曜日",
  "火曜日",
  "水曜日",
  "木曜日",
  "金曜日",
  "土曜日"
];


/* =========================
   画面切り替え
========================= */

document.querySelectorAll(
  "nav button"
).forEach(button => {

  button.addEventListener(
    "click",
    () => {

      const page =
        button.dataset.page;

      document.querySelectorAll(
        ".page"
      ).forEach(p => {
        p.classList.remove("active");
      });

      document.getElementById(
        page
      ).classList.add("active");

      renderAll();

    }
  );

});


/* =========================
   タイマー
========================= */

document.getElementById(
  "startTimer"
).addEventListener(
  "click",
  () => {

    if (data.activeTimer) {

      alert(
        "すでにタイマーが動いています。"
      );

      return;
    }

    const subject =
      document.getElementById(
        "timerSubject"
      ).value;

    data.activeTimer = {

      subject,

      start:
        Date.now()

    };

    save();

    updateTimer();

  }
);


document.getElementById(
  "stopTimer"
).addEventListener(
  "click",
  () => {

    if (!data.activeTimer) {

      alert(
        "タイマーは動いていません。"
      );

      return;
    }

    const end =
      Date.now();

    const duration =
      Math.max(
        0,
        Math.floor(
          (
            end -
            data.activeTimer.start
          ) / 1000
        )
      );

    data.records.push({

      id:
        createId(),

      subject:
        data.activeTimer.subject,

      start:
        data.activeTimer.start,

      end,

      duration,

      date:
        getLocalDate(
          new Date(end)
        )

    });

    data.activeTimer =
      null;

    save();

    document.getElementById(
      "timerDisplay"
    ).textContent =
      "00:00:00";

    document.getElementById(
      "timerStatus"
    ).textContent =
      "記録しました。";

    renderAll();

  }
);


function updateTimer() {

  if (!data.activeTimer) {

    document.getElementById(
      "timerDisplay"
    ).textContent =
      "00:00:00";

    return;
  }

  const seconds =
    Math.floor(
      (
        Date.now() -
        data.activeTimer.start
      ) / 1000
    );

  document.getElementById(
    "timerDisplay"
  ).textContent =
    formatTime(seconds);

  document.getElementById(
    "timerStatus"
  ).textContent =
    `${data.activeTimer.subject}を計測中`;

  setTimeout(
    updateTimer,
    1000
  );

}


function formatTime(seconds) {

  const h =
    Math.floor(
      seconds / 3600
    );

  const m =
    Math.floor(
      (seconds % 3600) / 60
    );

  const s =
    seconds % 60;

  return [
    h,
    m,
    s
  ]
    .map(
      x =>
        String(x).padStart(
          2,
          "0"
        )
    )
    .join(":");

}


/* =========================
   参考書追加
========================= */

document.getElementById(
  "addBook"
).addEventListener(
  "click",
  () => {

    const name =
      document.getElementById(
        "bookName"
      ).value.trim();

    const subject =
      document.getElementById(
        "bookSubject"
      ).value;

    const count =
      Number(
        document.getElementById(
          "problemCount"
        ).value
      );

    if (
      !name ||
      count < 1
    ) {

      alert(
        "参考書名と大問数を入力してください。"
      );

      return;
    }

    data.books.push({

      id:
        createId(),

      name,

      subject,

      problems:
        Array.from(
          {
            length: count
          },
          (_, i) => ({

            number:
              i + 1,

            done:
              false

          })
        )

    });

    save();

    document.getElementById(
      "bookName"
    ).value = "";

    document.getElementById(
      "problemCount"
    ).value = "";

    renderAll();

  }
);


/* =========================
   参考書編集
========================= */

function editBook(id) {

  const book =
    data.books.find(
      b =>
        b.id === id
    );

  if (!book) return;

  const newName =
    prompt(
      "参考書名を変更",
      book.name
    );

  if (
    newName === null ||
    !newName.trim()
  ) {
    return;
  }

  book.name =
    newName.trim();

  save();

  renderAll();

}


/* =========================
   参考書削除
========================= */

function deleteBook(id) {

  const book =
    data.books.find(
      b =>
        b.id === id
    );

  if (!book) return;

  const ok =
    confirm(
      `「${book.name}」を削除しますか？`
    );

  if (!ok) return;

  data.books =
    data.books.filter(
      b =>
        b.id !== id
    );

  data.plans.forEach(
    plan => {

      if (
        plan.bookId === id
      ) {

        plan.bookId = "";

      }

    }
  );

  save();

  renderAll();

}


/* =========================
   大問完了切り替え
========================= */

function toggleProblem(
  bookId,
  problemNumber
) {

  const book =
    data.books.find(
      b =>
        b.id === bookId
    );

  if (!book) return;

  const problem =
    book.problems.find(
      p =>
        p.number ===
        Number(problemNumber)
    );

  if (!problem) return;

  problem.done =
    !problem.done;

  save();

  renderAll();

}


/* =========================
   参考書表示
========================= */

function renderBooks() {

  const container =
    document.getElementById(
      "bookList"
    );

  container.innerHTML = "";

  if (
    data.books.length === 0
  ) {

    container.innerHTML =
      `<div class="empty">
        まだ参考書がありません。
      </div>`;

    return;
  }

  data.books.forEach(
    book => {

      const total =
        book.problems.length;

      const done =
        book.problems.filter(
          p =>
            p.done
        ).length;

      const percent =
        total === 0
          ? 0
          : Math.round(
              done /
              total *
              100
            );

      const div =
        document.createElement(
          "div"
        );

      div.className =
        "book";

      div.innerHTML = `

        <h3>
          ${escapeHTML(book.name)}
        </h3>

        <p>
          ${escapeHTML(book.subject)}
          ・
          ${done}/${total}
          (${percent}%)
        </p>

        <div class="progress">
          <div
            class="progress-bar"
            style="width:${percent}%">
          </div>
        </div>

        <div class="action-row">

          <button
            class="secondary"
            onclick="editBook('${book.id}')">
            ✏️ 編集
          </button>

          <button
            class="danger"
            onclick="deleteBook('${book.id}')">
            🗑️ 削除
          </button>

        </div>

        <div class="problems">

          ${book.problems
            .map(
              p => `

              <span
                class="problem ${
                  p.done
                    ? "done"
                    : ""
                }"
                onclick="
                  toggleProblem(
                    '${book.id}',
                    ${p.number}
                  )
                ">

                ${p.number}

              </span>

            `
            )
            .join("")}

        </div>

      `;

      container.appendChild(
        div
      );

    }
  );

}


/* =========================
   計画用参考書一覧
========================= */

function renderBookSelect() {

  const select =
    document.getElementById(
      "planBook"
    );

  const current =
    select.value;

  select.innerHTML =
    `<option value="">
      参考書なし
    </option>`;

  data.books.forEach(
    book => {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        book.id;

      option.textContent =
        `${book.subject}：${book.name}`;

      select.appendChild(
        option
      );

    }
  );

  if (
    data.books.some(
      b =>
        b.id === current
    )
  ) {

    select.value =
      current;

  }

}


/* =========================
   今日の大問目標を取得
========================= */

/*
  曜日ごとの計画は毎週繰り返すため、
  「今日」という日付ごとに目標大問を保存する。

  例：

  9月7日（月）
  → 大問1・2・3

  9月14日（月）
  → 大問4・5・6

  のように、前回までに終わった大問を
  自動的に飛ばして次の大問を選ぶ。
*/

function getDailyTargetProblems(
  plan,
  dateString = getLocalDate()
) {

  if (
    !plan.bookId ||
    !plan.problems ||
    plan.problems <= 0
  ) {
    return [];
  }

  const book =
    data.books.find(
      b =>
        b.id === plan.bookId
    );

  if (!book) return [];

  const key =
    `${dateString}_${plan.id}`;

  /*
    すでに今日の目標が保存されていれば
    それを使う。
  */

  if (
    Array.isArray(
      data.dailyTargets[key]
    )
  ) {

    return data.dailyTargets[key]
      .map(number =>
        book.problems.find(
          p =>
            p.number ===
            Number(number)
        )
      )
      .filter(Boolean);

  }


  /*
    今日の目標を新しく作る。

    未完了の大問から、
    計画で指定した数だけ選ぶ。
  */

  const targets =
    book.problems
      .filter(
        p =>
          !p.done
      )
      .slice(
        0,
        plan.problems
      );

  data.dailyTargets[key] =
    targets.map(
      p =>
        p.number
    );

  save();

  return targets;

}


/* =========================
   今日の大問進捗
========================= */

function getDailyProblemProgress(
  plan,
  dateString = getLocalDate()
) {

  const targets =
    getDailyTargetProblems(
      plan,
      dateString
    );

  if (
    targets.length === 0
  ) {

    return {

      target:
        plan.problems || 0,

      done:
        plan.problems || 0,

      remaining:
        []

    };

  }

  const done =
    targets.filter(
      p =>
        p.done
    ).length;

  const remaining =
    targets.filter(
      p =>
        !p.done
    );

  return {

    target:
      targets.length,

    done,

    remaining

  };

}


/* =========================
   計画追加
========================= */

document.getElementById(
  "addPlan"
).addEventListener(
  "click",
  () => {

    const weekday =
      Number(
        document.getElementById(
          "planDay"
        ).value
      );

    const subject =
      document.getElementById(
        "planSubject"
      ).value;

    const bookId =
      document.getElementById(
        "planBook"
      ).value;

    const minutes =
      Number(
        document.getElementById(
          "planMinutes"
        ).value
      ) || 0;

    const problems =
      Number(
        document.getElementById(
          "planProblems"
        ).value
      ) || 0;

    if (
      minutes === 0 &&
      problems === 0
    ) {

      alert(
        "目標時間または大問数を入力してください。"
      );

      return;
    }

    if (
      problems > 0 &&
      !bookId
    ) {

      alert(
        "大問数を指定する場合は、参考書を選択してください。"
      );

      return;
    }

    data.plans.push({

      id:
        createId(),

      weekday,

      subject,

      bookId,

      minutes,

      problems

    });

    save();

    document.getElementById(
      "planMinutes"
    ).value = "";

    document.getElementById(
      "planProblems"
    ).value = "";

    renderAll();

  }
);


/* =========================
   計画編集
========================= */

function editPlan(id) {

  const plan =
    data.plans.find(
      p =>
        p.id === id
    );

  if (!plan) return;

  const minutes =
    prompt(
      "目標時間（分）",
      plan.minutes
    );

  if (
    minutes === null
  ) {
    return;
  }

  const problems =
    prompt(
      "大問数",
      plan.problems
    );

  if (
    problems === null
  ) {
    return;
  }

  plan.minutes =
    Number(minutes) || 0;

  plan.problems =
    Number(problems) || 0;

  /*
    大問数を変更した場合は、
    今日の目標を作り直す。
  */

  Object.keys(
    data.dailyTargets
  ).forEach(
    key => {

      if (
        key.endsWith(
          `_${plan.id}`
        )
      ) {

        delete data.dailyTargets[key];

      }

    }
  );

  save();

  renderAll();

}


/* =========================
   計画削除
========================= */

function deletePlan(id) {

  const ok =
    confirm(
      "この学習計画を削除しますか？"
    );

  if (!ok) return;

  data.plans =
    data.plans.filter(
      p =>
        p.id !== id
    );

  Object.keys(
    data.dailyTargets
  ).forEach(
    key => {

      if (
        key.endsWith(
          `_${id}`
        )
      ) {

        delete data.dailyTargets[key];

      }

    }
  );

  save();

  renderAll();

}


/* =========================
   計画表示
========================= */

function renderPlans() {

  const container =
    document.getElementById(
      "planList"
    );

  container.innerHTML = "";

  if (
    data.plans.length === 0
  ) {

    container.innerHTML =
      `<div class="empty">
        まだ学習計画がありません。
      </div>`;

    return;
  }

  data.plans.forEach(
    plan => {

      const book =
        data.books.find(
          b =>
            b.id === plan.bookId
        );

      const progress =
        getDailyProblemProgress(
          plan
        );

      const div =
        document.createElement(
          "div"
        );

      div.className =
        "plan-card";

      let problemText = "";

      if (
        book &&
        plan.problems > 0
      ) {

        if (
          progress.remaining.length > 0
        ) {

          problemText =
            progress.remaining
              .map(
                p =>
                  `大問${p.number}`
              )
              .join("・");

        } else {

          problemText =
            "🎉 今日の大問目標達成！";

        }

      }

      div.innerHTML = `

        <h3>
          ${dayNames[plan.weekday]}
        </h3>

        <p>
          <strong>
            ${escapeHTML(plan.subject)}
          </strong>
        </p>

        ${
          book
            ? `
              <div class="plan-book">
                📚 ${escapeHTML(book.name)}
              </div>
            `
            : ""
        }

        <p>
          ⏱ ${plan.minutes}分
          ・
          📝 大問${plan.problems}個
        </p>

        ${
          book && plan.problems > 0
            ? `
              <p>
                <strong>
                  ${progress.done} / ${progress.target}個完了
                </strong>
              </p>

              ${
                progress.remaining.length > 0
                  ? `
                    <p>
                      👉 残り：
                      ${problemText}
                    </p>
                  `
                  : `
                    <p>
                      🎉 今日の大問目標達成！
                    </p>
                  `
              }
            `
            : ""
        }

        <div class="action-row">

          <button
            class="secondary"
            onclick="editPlan('${plan.id}')">
            ✏️ 編集
          </button>

          <button
            class="danger"
            onclick="deletePlan('${plan.id}')">
            🗑️ 削除
          </button>

        </div>

      `;

      container.appendChild(
        div
      );

    }
  );

}


/* =========================
   ホーム
========================= */

function renderHome() {

  const today =
    new Date().getDay();

  const todayString =
    getLocalDate();

  const plans =
    data.plans.filter(
      p =>
        p.weekday === today
    );

  const container =
    document.getElementById(
      "todayPlans"
    );

  container.innerHTML = "";

  if (
    plans.length === 0
  ) {

    container.innerHTML =
      `<div class="card empty">
        今日の学習計画はありません。
      </div>`;

  } else {

    plans.forEach(
      plan => {

        const book =
          data.books.find(
            b =>
              b.id ===
              plan.bookId
          );

        const progress =
          getDailyProblemProgress(
            plan,
            todayString
          );

        const div =
          document.createElement(
            "div"
          );

        div.className =
          "card today-task";

        let problemsHTML = "";

        if (
          book &&
          plan.problems > 0
        ) {

          if (
            progress.remaining.length > 0
          ) {

            problemsHTML = `

              <p>
                📝 大問進捗：
                <strong>
                  ${progress.done}
                  /
                  ${progress.target}
                  個完了
                </strong>
              </p>

              <p>
                👉 残り：
                <strong>
                  ${
                    progress.remaining
                      .map(
                        p =>
                          `大問${p.number}`
                      )
                      .join("・")
                  }
                </strong>
              </p>

            `;

          } else {

            problemsHTML = `

              <p>
                📝 大問進捗：
                <strong>
                  ${progress.done}
                  /
                  ${progress.target}
                  個完了
                </strong>
              </p>

              <p>
                🎉
                <strong>
                  今日の大問目標達成！
                </strong>
              </p>

            `;

          }

        }

        div.innerHTML = `

          <h3>
            ${escapeHTML(plan.subject)}
          </h3>

          ${
            book
              ? `
                <div class="plan-book">
                  📚 ${escapeHTML(book.name)}
                </div>
              `
              : ""
          }

          <p>
            ⏱ 目標：
            ${plan.minutes}分
          </p>

          <p>
            📝 大問目標：
            ${plan.problems}個
          </p>

          ${problemsHTML}

        `;

        container.appendChild(
          div
        );

      }
    );

  }


  const total =
    data.records
      .filter(
        r =>
          r.date ===
          todayString
      )
      .reduce(
        (sum, r) =>
          sum + r.duration,
        0
      );

  document.getElementById(
    "todayTotal"
  ).textContent =
    formatMinutes(total);

}


/* =========================
   分析
========================= */

function getDateDaysAgo(days) {

  const date =
    new Date();

  date.setDate(
    date.getDate() - days
  );

  return getLocalDate(
    date
  );

}


function getTotalSecondsSince(days) {

  const startDate =
    getDateDaysAgo(days);

  return data.records
    .filter(
      record =>
        record.date >=
        startDate
    )
    .reduce(
      (sum, record) =>
        sum + record.duration,
      0
    );

}


function formatMinutes(seconds) {

  return (
    Math.floor(
      seco
