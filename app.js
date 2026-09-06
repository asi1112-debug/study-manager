const STORAGE_KEY = "studyManagerData";

let data = JSON.parse(
  localStorage.getItem(STORAGE_KEY)
) || {
  books: [],
  plans: [],
  records: []
};

function save() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(data)
  );
}


/* =========================
   画面切り替え
========================= */

document.querySelectorAll(
  "nav button"
).forEach(button => {

  button.addEventListener("click", () => {

    const page = button.dataset.page;

    document.querySelectorAll(
      ".page"
    ).forEach(p => {
      p.classList.remove("active");
    });

    document.getElementById(
      page
    ).classList.add("active");

    renderAll();
  });

});


/* =========================
   タイマー
========================= */

let timerStart = null;
let timerSubject = null;

document.getElementById(
  "startTimer"
).addEventListener("click", () => {

  if (timerStart !== null) return;

  timerSubject =
    document.getElementById(
      "timerSubject"
    ).value;

  timerStart = Date.now();

  updateTimer();
});


document.getElementById(
  "stopTimer"
).addEventListener("click", () => {

  if (timerStart === null) return;

  const end = Date.now();

  const duration =
    Math.floor(
      (end - timerStart) / 1000
    );

  data.records.push({

    id: crypto.randomUUID(),

    subject: timerSubject,

    start: timerStart,

    end: end,

    duration: duration,

    date:
      new Date()
        .toISOString()
        .slice(0, 10)

  });

  save();

  timerStart = null;
  timerSubject = null;

  document.getElementById(
    "timerDisplay"
  ).textContent = "00:00:00";

  renderAll();
});


function updateTimer() {

  if (timerStart === null) return;

  const seconds =
    Math.floor(
      (Date.now() - timerStart) / 1000
    );

  document.getElementById(
    "timerDisplay"
  ).textContent =
    formatTime(seconds);

  setTimeout(updateTimer, 1000);
}


function formatTime(seconds) {

  const h =
    Math.floor(seconds / 3600);

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
      x => String(x).padStart(2, "0")
    )
    .join(":");
}


/* =========================
   参考書
========================= */

document.getElementById(
  "addBook"
).addEventListener("click", () => {

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

  if (!name || !count) {
    alert("参考書名と大問数を入力してください");
    return;
  }

  data.books.push({

    id: crypto.randomUUID(),

    name,

    subject,

    problems:
      Array.from(
        { length: count },
        (_, i) => ({
          number: i + 1,
          done: false
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

  renderBooks();
});


function renderBooks() {

  const container =
    document.getElementById(
      "bookList"
    );

  container.innerHTML = "";

  data.books.forEach(book => {

    const done =
      book.problems.filter(
        p => p.done
      ).length;

    const percent =
      Math.round(
        done /
        book.problems.length *
        100
      );

    const div =
      document.createElement("div");

    div.className = "book";

    div.innerHTML = `

      <h3>
        ${escapeHTML(book.name)}
      </h3>

      <p>
        ${book.subject}
       　
        ${done}/${book.problems.length}
        (${percent}%)
      </p>

      <div class="progress">
        <div
          class="progress-bar"
          style="width:${percent}%">
        </div>
      </div>

      <div class="problems">
        ${book.problems.map(p => `

          <span
            class="problem ${p.done ? "done" : ""}"
            data-book="${book.id}"
            data-problem="${p.number}">

            ${p.number}

          </span>

        `).join("")}

      </div>
    `;

    container.appendChild(div);
  });


  document.querySelectorAll(
    ".problem"
  ).forEach(problem => {

    problem.addEventListener(
      "click",
      () => {

        const book =
          data.books.find(
            b =>
              b.id ===
              problem.dataset.book
          );

        const p =
          book.problems.find(
            x =>
              x.number ===
              Number(
                problem.dataset.problem
              )
          );

        p.done = !p.done;

        save();

        renderBooks();
      }
    );

  });

}


/* =========================
   学習計画
========================= */

document.getElementById(
  "addPlan"
).addEventListener("click", () => {

  data.plans.push({

    id: crypto.randomUUID(),

    weekday:
      Number(
        document.getElementById(
          "planDay"
        ).value
      ),

    subject:
      document.getElementById(
        "planSubject"
      ).value,

    minutes:
      Number(
        document.getElementById(
          "planMinutes"
        ).value
      ) || 0,

    problems:
      Number(
        document.getElementById(
          "planProblems"
        ).value
      ) || 0

  });

  save();

  renderPlans();
});


function renderPlans() {

  const names = [
    "日曜日",
    "月曜日",
    "火曜日",
    "水曜日",
    "木曜日",
    "金曜日",
    "土曜日"
  ];

  const container =
    document.getElementById(
      "planList"
    );

  container.innerHTML = "";

  data.plans.forEach(plan => {

    const div =
      document.createElement("div");

    div.className = "card";

    div.innerHTML = `

      <h3>
        ${names[plan.weekday]}
      </h3>

      <p>
        ${plan.subject}
      </p>

      <p>
        ${plan.minutes}分
        ・
        大問${plan.problems}個
      </p>

    `;

    container.appendChild(div);

  });
}


/* =========================
   今日の学習
========================= */

function renderHome() {

  const today =
    new Date().getDay();

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

  plans.forEach(plan => {

    const div =
      document.createElement("div");

    div.className = "card";

    div.innerHTML = `

      <h3>
        ${plan.subject}
      </h3>

      <p>
        目標：
        ${plan.minutes}分
      </p>

      <p>
        大問：
        ${plan.problems}個
      </p>

    `;

    container.appendChild(div);

  });


  const todayString =
    new Date()
      .toISOString()
      .slice(0, 10);

  const total =
    data.records
      .filter(
        r =>
          r.date === todayString
      )
      .reduce(
        (sum, r) =>
          sum + r.duration,
        0
      );

  document.getElementById(
    "todayTotal"
  ).textContent =
    Math.floor(total / 60)
    + "分";

}


/* =========================
   統計
========================= */

function renderStats() {

  const result = {};

  data.records.forEach(record => {

    result[record.subject] =
      (result[record.subject] || 0)
      + record.duration;

  });

  const container =
    document.getElementById(
      "statsList"
    );

  container.innerHTML = "";

  Object.entries(result)
    .forEach(
      ([subject, seconds]) => {

        const div =
          document.createElement(
            "div"
          );

        div.className = "card";

        div.innerHTML = `

          <h3>
            ${subject}
          </h3>

          <p>
            ${Math.floor(seconds / 60)}
            分
          </p>

        `;

        container.appendChild(div);

      }
    );

}


/* =========================
   共通
========================= */

function escapeHTML(text) {

  const div =
    document.createElement("div");

  div.textContent = text;

  return div.innerHTML;
}


function renderAll() {

  renderHome();
  renderBooks();
  renderPlans();
  renderStats();

}

renderAll();
