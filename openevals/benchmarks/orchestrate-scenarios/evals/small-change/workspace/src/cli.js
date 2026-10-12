import { readFileSync, writeFileSync } from "node:fs";

const file = "data/todos.json";

const load = () => JSON.parse(readFileSync(file, "utf8"));

const save = (todos) => writeFileSync(file, `${JSON.stringify(todos, null, 2)}\n`);

const [command, ...args] = process.argv.slice(2);

const todos = load();

if (command === "list") {
  const ordered = [...todos].sort((a, b) => a.created.localeCompare(b.created));

  for (const todo of ordered) console.log(`${todo.done ? "[x]" : "[ ]"} ${todo.id}  ${todo.title}${todo.due === undefined ? "" : `  (due ${todo.due})`}`);
} else if (command === "add") {
  const dueAt = args.indexOf("--due");
  const due = dueAt === -1 ? undefined : args.splice(dueAt, 2)[1];
  const title = args.join(" ").trim();

  if (title === "") {
    console.error("usage: todo add <title> [--due YYYY-MM-DD]");
    process.exit(1);
  }

  const id = Math.max(0, ...todos.map((todo) => todo.id)) + 1;
  const todo = { id, title, done: false, created: new Date().toISOString() };

  if (due !== undefined) todo.due = due;

  todos.push(todo);
  save(todos);
  console.log(`added ${id}`);
} else if (command === "done") {
  const todo = todos.find((item) => item.id === Number(args[0]));

  if (todo === undefined) {
    console.error(`no todo ${args[0]}`);
    process.exit(1);
  }

  todo.done = true;
  save(todos);
} else {
  console.error("usage: todo <list|add|done>");
  process.exit(1);
}
